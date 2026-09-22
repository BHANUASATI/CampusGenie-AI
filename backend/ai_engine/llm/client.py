"""
LLM Client — Gemini with OpenRouter fallback
=============================================
Single entry point for all LLM calls in the AI engine.

Strategy
--------
1. Try Gemini (google-generativeai SDK) using GEMINI_API_KEY + model name.
2. If Gemini raises *any* exception, log the failure and retry the same
   prompt against OpenRouter's OpenAI-compatible endpoint using the
   standard `openai` SDK.
3. Return a normalised ``LLMResult`` so callers never need to know which
   provider answered.

Usage
-----
    from ai_engine.llm.client import call_llm, LLMResult

    result: LLMResult = call_llm(
        prompt="...",
        model_override=ai_config.GEMINI_CHAT_MODEL,   # optional
        temperature=ai_config.GEMINI_TEMPERATURE,      # optional
        max_tokens=ai_config.GEMINI_MAX_OUTPUT_TOKENS, # optional
    )
    print(result.text)          # str
    print(result.provider)      # "gemini" | "openrouter"
    print(result.prompt_tokens) # int
    print(result.completion_tokens)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any, Optional

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_openrouter_client():
    """Reuse the HTTP connection pool instead of creating one for each chat."""
    from openai import OpenAI
    from ai_engine.core.config import ai_config

    return OpenAI(
        api_key=ai_config.OPENROUTER_API_KEY,
        base_url=ai_config.LLM_BASE_URL,
        timeout=ai_config.LLM_REQUEST_TIMEOUT_SECONDS,
        max_retries=0,
    )


# ---------------------------------------------------------------------------
# Normalised result
# ---------------------------------------------------------------------------

@dataclass
class LLMResult:
    text: str
    provider: str                    # "gemini" | "openrouter"
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: float = 0.0
    fallback_used: bool = False
    error_before_fallback: Optional[str] = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _call_gemini(
    prompt: str,
    model_name: str,
    temperature: float,
    max_tokens: int,
) -> LLMResult:
    """Call Gemini via the google-generativeai SDK. Raises on any failure."""
    import re
    import time
    from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
    import google.generativeai as genai
    from ai_engine.core.config import ai_config

    genai.configure(api_key=ai_config.GEMINI_API_KEY)

    def _make_model(model_name: str):
        return genai.GenerativeModel(
            model_name=model_name,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )

    def _attempt(model: Any) -> Any:
        # request_options {"timeout": <ms>} bounds the RPC (incl. the SDK's own
        # retries); the ThreadPoolExecutor timeout below is a hard fallback.
        def _do_call():
            return model.generate_content(
                prompt,
                request_options={"timeout": int(ai_config.GEMINI_TIMEOUT_SECONDS * 1000)},
            )

        executor = ThreadPoolExecutor(max_workers=1)
        try:
            future = executor.submit(_do_call)
            return future.result(timeout=ai_config.GEMINI_TIMEOUT_SECONDS)
        finally:
            # Never block on a still-running request; otherwise a hung RPC
            # would defeat the timeout.
            executor.shutdown(wait=False, cancel_futures=False)

    def _retry_delay(exc: Exception) -> float:
        m = re.search(r"retry_delay\s*\{[^}]*seconds:\s*([0-9.]+)", str(exc))
        return max(1.0, min(40.0, float(m.group(1)) if m else 30.0))

    def _attempt_with_retry(model: Any) -> Any:
        # A 429 with a short retry delay is usually a transient per-minute cap:
        # retry the SAME model after the delay.  A second failure bubbles up so
        # the caller can rotate to the next model.
        try:
            return _attempt(model)
        except Exception as exc:  # noqa: BLE001 — SDK raises varied error types
            message = str(exc)
            if "429" in message or "RESOURCE_EXHAUSTED" in message:
                delay = min(_retry_delay(exc), 25.0)
                logger.warning(
                    "llm.call.gemini.rate_limited | model=%s retrying after %.0fs",
                    getattr(model, "model_name", "?"),
                    delay,
                )
                time.sleep(delay)
                return _attempt(model)
            raise

    # Each free-tier Gemini model has a hard requests/day cap.  Rotate through
    # the configured fallbacks so a capped/busy model doesn't take the whole
    # chatbot down.
    candidates: list[str] = []
    for m in (model_name, *ai_config.GEMINI_FALLBACK_MODELS):
        m = (m or "").strip()
        if m and m not in candidates:
            candidates.append(m)

    t0 = time.perf_counter()
    response = None
    last_error: Optional[Exception] = None
    timed_out = False
    for model_name in candidates:
        model = _make_model(model_name)
        try:
            response = _attempt_with_retry(model)
        except FuturesTimeout:
            # A slow/hung model must not sink the whole request — rotate.
            timed_out = True
            last_error = TimeoutError(
                f"Gemini model {model_name} timed out after {ai_config.GEMINI_TIMEOUT_SECONDS}s"
            )
            logger.warning(
                "llm.call.gemini.timeout | model=%s trying next", model_name
            )
            continue
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning(
                "llm.call.gemini.failed | model=%s trying next | %s",
                model_name,
                str(exc)[:160],
            )
            continue
        break

    if response is None:
        if timed_out:
            raise TimeoutError(str(last_error)) from None
        raise RuntimeError(f"All Gemini models failed: {last_error}") from last_error

    latency_ms = (time.perf_counter() - t0) * 1000

    raw_text = response.text or ""  # type: ignore[union-attr]
    prompt_tokens = (
        response.usage_metadata.prompt_token_count  # type: ignore[union-attr]
        if response.usage_metadata  # type: ignore[union-attr]
        else 0
    )
    completion_tokens = (
        response.usage_metadata.candidates_token_count  # type: ignore[union-attr]
        if response.usage_metadata  # type: ignore[union-attr]
        else 0
    )

    return LLMResult(
        text=raw_text,
        provider="gemini",
        model=model_name,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        latency_ms=latency_ms,
    )


def _call_openrouter(
    prompt: str,
    temperature: float,
    max_tokens: int,
) -> LLMResult:
    """
    Call OpenRouter via the OpenAI-compatible REST API.
    Uses the `openai` SDK pointed at LLM_BASE_URL.
    Raises on any failure.
    """
    import time
    from ai_engine.core.config import ai_config

    client = _get_openrouter_client()

    t0 = time.perf_counter()
    response = client.chat.completions.create(
        model=ai_config.LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    latency_ms = (time.perf_counter() - t0) * 1000

    raw_text = response.choices[0].message.content or ""
    usage = response.usage
    prompt_tokens = usage.prompt_tokens if usage else 0
    completion_tokens = usage.completion_tokens if usage else 0

    return LLMResult(
        text=raw_text,
        provider="openrouter",
        model=ai_config.LLM_MODEL,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        latency_ms=latency_ms,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def call_llm(
    prompt: str,
    model_override: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
) -> LLMResult:
    """
    Try Gemini first.  If Gemini fails for any reason, transparently retry
    with OpenRouter and mark ``result.fallback_used = True``.

    Parameters
    ----------
    prompt:
        Full prompt string (system + user content already merged by caller).
    model_override:
        Gemini model name to use. Defaults to ``GEMINI_CHAT_MODEL`` from config.
    temperature:
        Sampling temperature. Defaults to ``GEMINI_TEMPERATURE`` from config.
    max_tokens:
        Max output tokens. Defaults to ``GEMINI_MAX_OUTPUT_TOKENS`` from config.

    Returns
    -------
    LLMResult
        Normalised result with ``.text``, ``.provider``, token counts, etc.

    Raises
    ------
    RuntimeError
        Only if *both* Gemini and OpenRouter fail.
    """
    from ai_engine.core.config import ai_config

    # Resolve defaults from config
    gemini_model = model_override or ai_config.GEMINI_CHAT_MODEL
    temp = temperature if temperature is not None else ai_config.GEMINI_TEMPERATURE
    tokens = max_tokens or ai_config.GEMINI_MAX_OUTPUT_TOKENS

    gemini_error: Optional[str] = None

    # ------------------------------------------------------------------
    # Attempt 1: Gemini (only if a real API key is configured)
    # ------------------------------------------------------------------
    _PLACEHOLDER_KEYS = {"", "your-gemini-api-key", "your_gemini_api_key"}
    gemini_key_valid = ai_config.GEMINI_API_KEY.strip() not in _PLACEHOLDER_KEYS

    if not gemini_key_valid:
        gemini_error = "Gemini API key is not configured — skipping to OpenRouter"
        logger.info("llm.call.gemini.skipped | reason=no_api_key")
    else:
        try:
            result = _call_gemini(prompt, gemini_model, temp, tokens)
            logger.debug(
                "llm.call.gemini.success | model=%s latency=%.0fms tokens=%d",
                gemini_model,
                result.latency_ms,
                result.completion_tokens,
            )
            return result

        except Exception as exc:
            gemini_error = str(exc)
            logger.warning(
                "llm.call.gemini.failed — falling back to OpenRouter | error=%s",
                gemini_error,
            )

    # ------------------------------------------------------------------
    # Attempt 2: OpenRouter fallback
    # ------------------------------------------------------------------
    try:
        result = _call_openrouter(prompt, temp, tokens)
        result.fallback_used = True
        result.error_before_fallback = gemini_error
        logger.info(
            "llm.call.openrouter.success | model=%s latency=%.0fms tokens=%d",
            result.model,
            result.latency_ms,
            result.completion_tokens,
        )
        return result

    except Exception as exc:
        openrouter_error = str(exc)
        logger.error(
            "llm.call.openrouter.failed | gemini_error=%s openrouter_error=%s",
            gemini_error,
            openrouter_error,
        )
        raise RuntimeError(
            f"Both LLM providers failed.\n"
            f"  Gemini: {gemini_error}\n"
            f"  OpenRouter: {openrouter_error}"
        ) from exc
