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

from ai_engine.core.tracing import add_metadata, as_run_outputs, record_usage, trace_run

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_openrouter_client():
    """Reuse the HTTP connection pool instead of creating one for each chat."""
    from openai import OpenAI
    from ai_engine.core.config import ai_config

    return OpenAI(
        api_key=ai_config.OPENROUTER_API_KEY,
        base_url=ai_config.LLM_BASE_URL,
        timeout=min(float(ai_config.LLM_REQUEST_TIMEOUT_SECONDS), 8.0),
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

@trace_run(
    "llm.gemini.generate_content",
    run_type="llm",
    tags=["gemini"],
    process_outputs=as_run_outputs,
)
def _call_gemini(
    prompt: str,
    model_name: str,
    temperature: float,
    max_tokens: int,
) -> LLMResult:
    """Call Gemini via the google-generativeai SDK. Raises on any failure.

    The first model is tried alone for a short grace period. If it has not
    answered by then, the fallback models start in parallel and the first
    successful answer wins. This keeps the common case to one request while
    removing the long tail when a single Gemini endpoint stalls.
    """
    import time
    from concurrent.futures import ThreadPoolExecutor, wait
    import google.generativeai as genai
    from ai_engine.core.config import ai_config

    genai.configure(api_key=ai_config.GEMINI_API_KEY)

    def _make_model(model: str):
        return genai.GenerativeModel(
            model_name=model,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )

    # Bound the RPC itself; the coordinator below enforces the overall budget.
    timeout_s = min(float(ai_config.GEMINI_TIMEOUT_SECONDS), 8.0)
    hedge_delay_s = min(float(ai_config.GEMINI_HEDGE_DELAY_SECONDS), timeout_s / 2.0)

    def _do_call(model):
        return model.generate_content(
            prompt,
            request_options={"timeout": int(timeout_s * 1000)},
        )

    _QUOTA_MARKERS = (
        "exceeded your current quota",
        "quota exceeded",
        "billing",
        "check your plan",
    )
    _TIMEOUT_MARKERS = ("timeout", "timed out", "deadline exceeded")

    def _failure_reason(message: str) -> str:
        lowered = message.lower()
        if any(marker in lowered for marker in _QUOTA_MARKERS):
            return "quota_exhausted"
        if any(marker in lowered for marker in _TIMEOUT_MARKERS):
            return "timeout"
        if "incomplete answer" in lowered:
            return "incomplete"
        return "error"

    def _is_complete(response) -> bool:
        """Reject answers cut off by the model's output-token budget.

        Some thinking models (notably gemini-2.5-flash) burn max_output_tokens
        on internal reasoning and finish with only a few visible words. Showing
        that half-sentence to a student is worse than trying the next model, so
        treat MAX_TOKENS as a failed candidate.
        """
        text = response.text or ""
        if not text.strip():
            return False
        stripped = text.strip()
        json_like = stripped.startswith("{")
        for candidate in getattr(response, "candidates", []) or []:
            reason = getattr(candidate, "finish_reason", None)
            name = getattr(reason, "name", str(reason) if reason else "")
            hit_cap = "MAX_TOKENS" in name.upper() or str(reason) == "2"
            # A plain-text warmup ("OK") can legitimately finish at the token
            # cap. Only a half-written JSON object is unusable to the caller.
            if hit_cap and json_like and stripped.count("{") > stripped.count("}"):
                return False
        if json_like and stripped.count("{") > stripped.count("}"):
            return False
        return True

    candidates: list[str] = []
    for model in (model_name, *ai_config.GEMINI_FALLBACK_MODELS):
        model = (model or "").strip()
        if model and model not in candidates:
            candidates.append(model)

    t0 = time.perf_counter()
    deadline = t0 + timeout_s
    executor = ThreadPoolExecutor(max_workers=max(1, len(candidates)))
    pending = {}  # Future -> model name
    skipped: list[dict] = []
    next_index = 0
    response = None
    winner_model = ""
    last_error: Optional[Exception] = None
    hedged = False

    def _start_next():
        nonlocal next_index
        if next_index >= len(candidates):
            return
        model = candidates[next_index]
        next_index += 1
        pending[executor.submit(_do_call, _make_model(model))] = model

    try:
        _start_next()
        while response is None and pending:
            now = time.perf_counter()
            remaining = deadline - now
            if remaining <= 0:
                break

            # Primary gets a head start. After the grace period, release every
            # remaining model at once instead of waiting for a hung one.
            if not hedged and next_index < len(candidates) and now - t0 >= hedge_delay_s:
                while next_index < len(candidates):
                    _start_next()
                hedged = True

            if hedged:
                wait_seconds = remaining
            else:
                wait_seconds = hedge_delay_s - (now - t0)
            done, _ = wait(list(pending), timeout=max(0.01, wait_seconds))

            if not done:
                if not hedged:
                    continue  # loop again and trigger the hedge
                break

            for future in list(done):
                model = pending.pop(future)
                try:
                    candidate_response = future.result()
                    if not _is_complete(candidate_response):
                        raise RuntimeError("model returned an incomplete answer (MAX_TOKENS)")
                    response = candidate_response
                    winner_model = model
                    break
                except Exception as exc:  # noqa: BLE001
                    last_error = exc
                    reason = _failure_reason(str(exc))
                    skipped.append(
                        {"model": model, "reason": reason, "detail": str(exc)[:160]}
                    )
                    logger.warning(
                        "llm.call.gemini.%s | model=%s trying next | %s",
                        reason,
                        model,
                        str(exc)[:120],
                    )
                    # A fast failure still has models left to try.
                    if next_index < len(candidates):
                        _start_next()
    finally:
        # Do not wait on still-running requests: a hung RPC would defeat the
        # timeout that protects the student's chat request.
        executor.shutdown(wait=False, cancel_futures=True)

    if response is None:
        if not skipped:
            # The futures can finish just after the deadline and leave no
            # exception to report. Name the models instead of logging "None".
            skipped = [
                {"model": model, "reason": "timeout", "detail": "no answer before deadline"}
                for model in candidates
            ]
            logger.warning(
                "llm.call.gemini.no_response | models=%s deadline=%.1fs",
                ",".join(candidates),
                timeout_s,
            )
        add_metadata(skipped_models=skipped, candidates_tried=len(skipped))
        if any(item["reason"] == "timeout" for item in skipped):
            raise TimeoutError(
                f"Gemini models timed out after {timeout_s:.0f}s "
                f"(tried: {', '.join(candidates)})"
            ) from None
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

    record_usage(
        model=winner_model,
        provider="gemini",
        input_tokens=prompt_tokens,
        output_tokens=completion_tokens,
        latency_ms=latency_ms,
        candidates_tried=len(skipped) + 1,
        skipped_models=skipped or None,
    )

    return LLMResult(
        text=raw_text,
        provider="gemini",
        model=winner_model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        latency_ms=latency_ms,
    )


@trace_run(
    "llm.openrouter.chat_completion",
    run_type="llm",
    tags=["openrouter"],
    process_outputs=as_run_outputs,
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

    record_usage(
        model=ai_config.LLM_MODEL,
        provider="openrouter",
        input_tokens=prompt_tokens,
        output_tokens=completion_tokens,
        latency_ms=latency_ms,
    )

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

@trace_run("llm.call", run_type="chain", tags=["provider-routing"], process_outputs=as_run_outputs)
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
