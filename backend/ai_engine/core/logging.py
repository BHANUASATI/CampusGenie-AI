"""
Structured JSON Logging for the AI Engine
==========================================
Every log entry contains:
  - trace_id      (correlates all logs for a single request)
  - user_id
  - node_name     (which LangGraph node is executing)
  - latency_ms
  - token counts / cost (for LLM calls)

Usage:
    from ai_engine.core.logging import get_logger, trace_context
    logger = get_logger(__name__)
    with trace_context(trace_id="abc", user_id=1):
        logger.info("node.start", node="classify_intent")
"""

from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Dict, Optional

from ai_engine.core.config import ai_config


# ---------------------------------------------------------------------------
# Context variables — propagate trace_id / user_id automatically
# ---------------------------------------------------------------------------
_trace_id_var: ContextVar[str] = ContextVar("trace_id", default="")
_user_id_var: ContextVar[Optional[int]] = ContextVar("user_id", default=None)


def get_trace_id() -> str:
    """Return current trace id or generate a fresh one."""
    tid = _trace_id_var.get()
    return tid if tid else str(uuid.uuid4())


def get_user_id() -> Optional[int]:
    return _user_id_var.get()


@contextmanager
def trace_context(trace_id: str = None, user_id: int = None):
    """Context manager that sets trace / user context for all nested logs."""
    tid = trace_id or str(uuid.uuid4())
    token_t = _trace_id_var.set(tid)
    token_u = _user_id_var.set(user_id)
    try:
        yield tid
    finally:
        _trace_id_var.reset(token_t)
        _user_id_var.reset(token_u)


# ---------------------------------------------------------------------------
# JSON formatter
# ---------------------------------------------------------------------------
class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "trace_id": get_trace_id(),
            "user_id": get_user_id(),
        }

        # Attach extra fields attached via logger.info("msg", extra={...})
        for key, value in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "taskName",
            ):
                log_obj[key] = value

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj, default=str)


# ---------------------------------------------------------------------------
# Logger factory
# ---------------------------------------------------------------------------
def get_logger(name: str) -> logging.Logger:
    """Return a structured logger for the given module name."""
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger  # already configured

    level = getattr(logging, ai_config.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)
    logger.propagate = False
    return logger


# ---------------------------------------------------------------------------
# Timing utility
# ---------------------------------------------------------------------------
class Timer:
    """Simple context-manager timer that returns elapsed ms."""

    def __init__(self):
        self.elapsed_ms: float = 0.0

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, *_):
        self.elapsed_ms = (time.perf_counter() - self._start) * 1000


# ---------------------------------------------------------------------------
# LLM call logger (attaches token / cost info)
# ---------------------------------------------------------------------------
def log_llm_call(
    logger: logging.Logger,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    latency_ms: float,
    node_name: str,
    success: bool = True,
    error: str = None,
):
    """Emit a structured log entry for every Gemini API call."""
    # Rough cost estimate — Gemini Flash pricing (as of 2025)
    # Input:  $0.075 / 1M tokens,  Output: $0.30 / 1M tokens
    cost_usd = (prompt_tokens / 1_000_000) * 0.075 + (completion_tokens / 1_000_000) * 0.30

    logger.info(
        "llm.call",
        extra={
            "event": "llm.call",
            "model": model,
            "node": node_name,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "latency_ms": round(latency_ms, 2),
            "estimated_cost_usd": round(cost_usd, 6),
            "success": success,
            "error": error,
        },
    )
