"""
AI Engine Security Layer
========================
Responsibilities:
  1. Prompt injection detection and blocking
  2. PII masking before messages reach the LLM
  3. Per-user in-memory rate limiting (token bucket)
  4. Input validation and sanitisation

This module runs BEFORE any message enters the LangGraph.
"""

from __future__ import annotations

import hashlib
import re
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from ai_engine.core.config import ai_config
from ai_engine.core.exceptions import PromptInjectionDetected, RateLimitExceeded
from ai_engine.core.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# 1. Prompt Injection Detection
# ---------------------------------------------------------------------------

# Patterns that indicate prompt injection attempts
_INJECTION_PATTERNS: List[re.Pattern] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"ignore\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|rules?|context)",
        r"you\s+are\s+now\s+",
        r"act\s+as\s+(if\s+you\s+are|a\s+|an\s+)",
        r"pretend\s+(you\s+)?(have\s+no|are\s+a|that\s+you)",
        r"jailbreak",
        r"DAN\s+mode",
        r"developer\s+mode\s+enabled",
        r"forget\s+(everything|all|your|the)",
        r"disregard\s+(all|previous|your|the)",
        r"bypass\s+(safety|filter|restrict)",
        r"override\s+(your|all|safety|system)\s+(prompt|instruction|rule)",
        r"<\s*system\s*>",
        r"\[INST\]",
        r"###\s*(System|Instruction)",
        r"print\s+(your\s+)?(system\s+)?prompt",
        r"reveal\s+(your\s+)?(instructions?|prompt|rules?)",
    ]
]


def scan_for_injection(text: str) -> Tuple[bool, Optional[str]]:
    """
    Returns (is_injected, matched_pattern_description).
    """
    if not ai_config.ENABLE_PROMPT_INJECTION_SCAN:
        return False, None

    for pattern in _INJECTION_PATTERNS:
        m = pattern.search(text)
        if m:
            return True, m.group(0)

    # Heuristic: unusually long messages are suspicious
    if len(text) > 4000:
        return True, "message exceeds maximum allowed length (4000 chars)"

    return False, None


def validate_and_clean_input(user_id: int, message: str) -> str:
    """
    Full input validation pipeline:
      1. Strip leading/trailing whitespace
      2. Scan for prompt injection
      3. Return cleaned message

    Raises PromptInjectionDetected if injection is found.
    """
    cleaned = message.strip()

    if not cleaned:
        raise ValueError("Message cannot be empty")

    is_injected, pattern = scan_for_injection(cleaned)
    if is_injected:
        logger.warning(
            "security.injection_detected",
            extra={
                "event": "security.injection_detected",
                "user_id": user_id,
                "pattern": pattern,
                "message_hash": hashlib.sha256(cleaned.encode()).hexdigest()[:16],
            },
        )
        raise PromptInjectionDetected(
            "Your message contains patterns that cannot be processed.",
            {"pattern": pattern},
        )

    return cleaned


# ---------------------------------------------------------------------------
# 2. PII Masking
# ---------------------------------------------------------------------------

# (pattern, replacement_label)
_PII_PATTERNS: List[Tuple[re.Pattern, str]] = [
    # Aadhaar (12 digit, with or without spaces/dashes)
    (re.compile(r"\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b"), "[AADHAAR]"),
    # Indian mobile number
    (re.compile(r"\b[6-9]\d{9}\b"), "[PHONE]"),
    # Email address
    (re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b"), "[EMAIL]"),
    # PAN card
    (re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"), "[PAN]"),
    # Passport number
    (re.compile(r"\b[A-PR-WY][1-9]\d\s?\d{4}[1-9]\b"), "[PASSPORT]"),
    # Credit/debit card (basic Luhn-shaped pattern)
    (re.compile(r"\b(?:\d[ \-]?){13,16}\b"), "[CARD_NUMBER]"),
]


def mask_pii(text: str) -> Tuple[str, List[str]]:
    """
    Replace PII in text with labelled placeholders.
    Returns (masked_text, list_of_pii_types_found).
    """
    if not ai_config.ENABLE_PII_MASKING:
        return text, []

    masked = text
    found: List[str] = []
    for pattern, label in _PII_PATTERNS:
        count_before = len(found)
        masked = pattern.sub(label, masked)
        if len(found) != count_before or pattern.search(text):
            if label not in found:
                found.append(label)

    return masked, found


# ---------------------------------------------------------------------------
# 3. In-Memory Rate Limiter (token bucket per user)
# ---------------------------------------------------------------------------

@dataclass
class _UserBucket:
    """Token bucket state for one user."""
    tokens: float = 0.0
    last_refill: float = field(default_factory=time.time)
    daily_count: int = 0
    day_start: float = field(default_factory=time.time)


class RateLimiter:
    """
    Token bucket rate limiter.

    Limits:
      - RATE_LIMIT_PER_MINUTE requests per minute (smooth)
      - RATE_LIMIT_BURST burst capacity
      - RATE_LIMIT_PER_DAY daily cap
    """

    def __init__(self):
        self._buckets: Dict[int, _UserBucket] = defaultdict(_UserBucket)

    def check_and_consume(self, user_id: int) -> None:
        """
        Checks rate limit for user_id.
        Raises RateLimitExceeded if the limit is hit.
        """
        now = time.time()
        bucket = self._buckets[user_id]

        # Reset daily counter at midnight
        if now - bucket.day_start >= 86_400:
            bucket.daily_count = 0
            bucket.day_start = now

        if bucket.daily_count >= ai_config.RATE_LIMIT_PER_DAY:
            raise RateLimitExceeded(
                f"Daily limit of {ai_config.RATE_LIMIT_PER_DAY} requests reached. "
                "Please try again tomorrow.",
                {"limit": ai_config.RATE_LIMIT_PER_DAY, "type": "daily"},
            )

        # Refill tokens based on elapsed time
        elapsed = now - bucket.last_refill
        refill_rate = ai_config.RATE_LIMIT_PER_MINUTE / 60.0  # tokens per second
        bucket.tokens = min(
            ai_config.RATE_LIMIT_BURST,
            bucket.tokens + elapsed * refill_rate,
        )
        bucket.last_refill = now

        if bucket.tokens < 1.0:
            retry_after = int((1.0 - bucket.tokens) / refill_rate) + 1
            raise RateLimitExceeded(
                f"Rate limit exceeded. Please wait {retry_after} seconds.",
                {"retry_after_seconds": retry_after, "type": "per_minute"},
            )

        bucket.tokens -= 1.0
        bucket.daily_count += 1


# Singleton rate limiter instance
rate_limiter = RateLimiter()
