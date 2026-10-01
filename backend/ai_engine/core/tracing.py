"""
LangSmith Tracing Bootstrap
===========================
Single place that turns LangSmith tracing on and wraps the AI engine's own
functions into LangSmith runs.

Why this module exists
----------------------
LangChain / LangGraph / ``langsmith.traceable`` read their configuration from
**process environment variables**, and some of it is snapshotted the first time
those packages are imported.  That is why the AI engine talks to Gemini through
the raw ``google-generativeai`` SDK and OpenRouter through the raw ``openai``
SDK: those calls are invisible to LangSmith's automatic instrumentation, so we
create the runs ourselves.

Two rules keep the traces tidy:

1. :func:`configure_langsmith` must be called **before** anything imports
   ``langchain`` / ``langgraph``.  ``src/main.py`` calls it as its first
   AI-engine import for exactly this reason.
2. Everything else is decorated with :func:`trace_run`, which degrades to a plain
   function call when the ``langsmith`` package is missing or tracing is off, so
   instrumented code paths never need an ``if tracing:`` branch.

Usage
-----
::

    from ai_engine.core.tracing import configure_langsmith, trace_run, record_usage

    configure_langsmith()                     # once, at process start

    @trace_run("llm.gemini", run_type="llm")
    def ask(prompt: str) -> str:
        ...
        record_usage(model=model, input_tokens=12, output_tokens=40)
        return text
"""

from __future__ import annotations

import os
from typing import Any, Callable, Dict, Optional, TypeVar

from ai_engine.core.logging import get_logger

logger = get_logger(__name__)

F = TypeVar("F", bound=Callable[..., Any])

# LangSmith run payloads are stored per call; keep prompts/answers readable but
# bounded so a pathological document dump cannot produce a 4 MB run.
MAX_FIELD_CHARS = 20_000

# Tag added to every run so the whole backend is filterable in one click.
APP_TAG = "campusgenie"

# Rough public pricing, USD per 1M tokens.  Only used to populate the cost
# columns in LangSmith — it is an estimate, not a billing source.
_COST_PER_1M = {
    "gemini": (0.075, 0.30),      # Flash family
    "openrouter": (0.0, 0.0),     # free/paid models vary — leave at zero
}

_STATE: Dict[str, Any] = {"configured": False, "enabled": False, "reason": "not configured yet"}


# ---------------------------------------------------------------------------
# Availability (never raises)
# ---------------------------------------------------------------------------
def _langsmith_import() -> Optional[Any]:
    """Return the ``langsmith`` module, or ``None`` when it is not installed."""
    try:
        import langsmith  # noqa: PLC0415 — optional dependency, imported lazily
        return langsmith
    except Exception:  # pragma: no cover - only hit on a broken install
        return None


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
def configure_langsmith(force: bool = False) -> bool:
    """
    Publish the LangSmith settings from ``.env`` as real environment variables.

    Safe to call more than once; later calls are no-ops unless ``force=True``.

    Args:
        force: Re-apply the configuration even if it already ran.

    Returns:
        bool: True when tracing is active, False otherwise.
    """
    if _STATE["configured"] and not force:
        return bool(_STATE["enabled"])

    _STATE["configured"] = True
    _STATE["enabled"] = False

    langsmith = _langsmith_import()
    if langsmith is None:
        _STATE["reason"] = "langsmith package is not installed"
        logger.warning("tracing.disabled", extra={"event": "tracing.disabled", "reason": _STATE["reason"]})
        return False

    try:
        from ai_engine.core.config import ai_config

        api_key = (ai_config.LANGSMITH_API_KEY or "").strip()
        if not ai_config.ENABLE_LANGSMITH_TRACING:
            _STATE["reason"] = "ENABLE_LANGSMITH_TRACING is false"
            _set_tracing_env(False)
            logger.info("tracing.disabled", extra={"event": "tracing.disabled", "reason": _STATE["reason"]})
            return False
        if not api_key:
            _STATE["reason"] = "LANGSMITH_API_KEY is missing"
            _set_tracing_env(False)
            logger.warning("tracing.disabled", extra={"event": "tracing.disabled", "reason": _STATE["reason"]})
            return False

        # Every one of these must be a real env var: langchain-core, langgraph
        # and langsmith's own decorators all read os.environ.
        os.environ["LANGSMITH_TRACING"]     = "true"
        os.environ["LANGCHAIN_TRACING_V2"]  = "true"          # legacy key honoured by langchain-core
        os.environ["LANGSMITH_API_KEY"]     = api_key
        os.environ["LANGSMITH_ENDPOINT"]    = ai_config.LANGSMITH_ENDPOINT
        os.environ["LANGSMITH_PROJECT"]     = ai_config.LANGSMITH_PROJECT
        os.environ["LANGSMITH_TAGS"]        = APP_TAG
        # Never let a .env file silently re-point tracing at a real account.
        os.environ["LANGCHAIN_API_KEY"]     = api_key
    except Exception as exc:  # noqa: BLE001 — observability must never break the app
        _STATE["reason"] = f"configuration error: {exc}"
        _set_tracing_env(False)
        logger.warning("tracing.disabled", extra={"event": "tracing.disabled", "reason": _STATE["reason"]})
        return False

    _STATE["enabled"] = True
    _STATE["reason"] = "enabled"
    logger.info(
        "tracing.enabled",
        extra={
            "event": "tracing.enabled",
            "project": ai_config.LANGSMITH_PROJECT,
            "endpoint": ai_config.LANGSMITH_ENDPOINT,
        },
    )
    return True


def _set_tracing_env(enabled: bool) -> None:
    """Force the tracing env vars on or off (dotenv may have set them earlier)."""
    if enabled:
        return
    os.environ["LANGSMITH_TRACING"] = "false"
    os.environ["LANGCHAIN_TRACING_V2"] = "false"


def is_enabled() -> bool:
    """True when LangSmith runs are actually being recorded right now."""
    langsmith = _langsmith_import()
    if langsmith is None:
        return False
    if _STATE.get("enabled"):
        return True
    return os.environ.get("LANGSMITH_TRACING", "").lower() == "true"


def status() -> Dict[str, Any]:
    """Small dict for the health endpoint / startup banner."""
    return {
        "enabled": is_enabled(),
        "configured": bool(_STATE.get("configured")),
        "reason": _STATE.get("reason"),
        "project": os.environ.get("LANGSMITH_PROJECT"),
        "endpoint": os.environ.get("LANGSMITH_ENDPOINT"),
        "package": "langsmith" if _langsmith_import() else None,
    }


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------
def ping(timeout: float = 20.0) -> Dict[str, Any]:
    """
    Post a throwaway run to prove the key, endpoint and network all work.

    Returns a status dict — ``{"ok": True, "run_id": ...}`` on success.  Never
    raises, because a broken observability backend must not stop the app.
    """
    if not is_enabled():
        return {"ok": False, "error": _STATE.get("reason", "tracing is off")}

    try:
        from langsmith import Client
        from langsmith.run_trees import RunTree
        from datetime import datetime, timezone

        client = Client(
            api_url=os.environ.get("LANGSMITH_ENDPOINT"),
            api_key=os.environ.get("LANGSMITH_API_KEY"),
            timeout_ms=int(timeout * 1000),
        )
        now = datetime.now(timezone.utc)
        rt = RunTree(
            name="campusgenie.startup_check",
            run_type="chain",
            project_name=os.environ.get("LANGSMITH_PROJECT"),
            start_time=now,
            end_time=now,
            tags=[APP_TAG, "startup_check"],
            inputs={"event": "startup"},
            outputs={"event": "startup", "status": "ok"},
            extra={"metadata": {"event": "campusgenie.startup_check"}},
            ls_client=client,
        )
        rt.post()
        return {"ok": True, "run_id": str(rt.id), "project": os.environ.get("LANGSMITH_PROJECT")}
    except Exception as exc:  # noqa: BLE001
        logger.warning("tracing.ping.failed", extra={"event": "tracing.ping.failed", "error": str(exc)[:300]})
        return {"ok": False, "error": str(exc)[:300]}


# ---------------------------------------------------------------------------
# Run decorators
# ---------------------------------------------------------------------------
def _truncate(value: Any) -> Any:
    """Shorten long strings so run payloads stay small but readable."""
    if isinstance(value, str) and len(value) > MAX_FIELD_CHARS:
        return value[:MAX_FIELD_CHARS] + f"… [+{len(value) - MAX_FIELD_CHARS} chars]"
    return value


def _sanitize(value: Any, _depth: int = 0) -> Any:
    """Best-effort conversion of a return value into JSON-safe run output."""
    from dataclasses import asdict, is_dataclass

    if _depth > 4:
        return repr(value)[:MAX_FIELD_CHARS]
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return _truncate(value)
    if is_dataclass(value) and not isinstance(value, type):
        return _sanitize(asdict(value), _depth + 1)
    if isinstance(value, dict):
        return {str(k): _sanitize(v, _depth + 1) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_sanitize(v, _depth + 1) for v in list(value)[:200]]
    return _truncate(repr(value))


def as_run_outputs(value: Any) -> Dict[str, Any]:
    """
    Turn a function's return value into a top-level dict for a run's outputs.

    Dataclasses (e.g. ``LLMResult``) become their own keys instead of being
    hidden under a generic ``output`` wrapper, which makes runs far easier to
    read in the LangSmith sidebar.
    """
    from dataclasses import is_dataclass

    if isinstance(value, dict):
        return {str(k): _sanitize(v) for k, v in value.items()}
    if is_dataclass(value) and not isinstance(value, type):
        return {str(k): _sanitize(v) for k, v in _sanitize(value).items()}
    return {"output": _sanitize(value)}


def trace_run(
    name: str,
    run_type: str = "chain",
    tags: Optional[list] = None,
    metadata: Optional[Dict[str, Any]] = None,
    process_inputs: Optional[Callable[[Dict[str, Any]], Dict[str, Any]]] = None,
    process_outputs: Optional[Callable[[Any], Dict[str, Any]]] = None,
) -> Callable[[F], F]:
    """
    Decorator that records a LangSmith run for every call of the function.

    The run nests under whatever run is already active, so a chat turn shows up
    as a tree: ``chat`` → ``graph`` → ``llm`` / ``retriever``.

    Args:
        name: Run name shown in the LangSmith UI.
        run_type: ``chain`` | ``llm`` | ``retriever`` | ``tool`` | ...
        tags: Extra tags; the ``campusgenie`` tag is always added.
        metadata: Static metadata attached to every run.
        process_inputs: Custom input serializer (prompts are truncated by
            default).
        process_outputs: Custom output serializer (defaults to ``_sanitize``).

    Returns:
        A decorator.  When LangSmith is unavailable it returns the function
        unchanged, so callers never branch on "are we tracing?".
    """
    run_tags = [APP_TAG] + list(tags or [])

    def _default_inputs(inputs: Dict[str, Any]) -> Dict[str, Any]:
        return {k: _sanitize(v) for k, v in (inputs or {}).items()}

    def _default_outputs(outputs: Any) -> Dict[str, Any]:
        return as_run_outputs(outputs)

    def decorator(fn: F) -> F:
        if _langsmith_import() is None:  # pragma: no cover - optional dependency
            return fn
        try:
            from langsmith import traceable

            wrapped = traceable(
                name=name,
                run_type=run_type,
                tags=run_tags,
                metadata=metadata,
                process_inputs=process_inputs or _default_inputs,
                process_outputs=process_outputs or _default_outputs,
            )(fn)
        except Exception as exc:  # noqa: BLE001 — never break the wrapped call
            logger.warning(
                "tracing.decorator_fallback",
                extra={"event": "tracing.decorator_fallback", "fn": getattr(fn, "__name__", "?"), "error": str(exc)},
            )
            return fn
        return wrapped  # type: ignore[return-value]

    return decorator


# ---------------------------------------------------------------------------
# Enriching the active run
# ---------------------------------------------------------------------------
def _current_run():
    """Return the active RunTree, or ``None`` when not tracing."""
    if not is_enabled():
        return None
    try:
        from langsmith import get_current_run_tree

        return get_current_run_tree()
    except Exception:  # noqa: BLE001
        return None


def add_metadata(**fields: Any) -> None:
    """Attach fields to the run that is currently executing (no-op if none)."""
    run = _current_run()
    if run is None or not fields:
        return
    try:
        run.add_metadata({k: _sanitize(v) for k, v in fields.items()})
    except Exception:  # noqa: BLE001
        pass


def current_run_id() -> Optional[str]:
    """ID of the active LangSmith run (useful for logs → trace jumps)."""
    run = _current_run()
    return str(run.id) if run is not None else None


def _price_for(model: str, provider: Optional[str]) -> Optional[tuple]:
    """Resolve the (input, output) USD-per-1M-tokens pair for a model."""
    haystack = f"{provider or ''} {model or ''}".lower()
    for prefix, prices in _COST_PER_1M.items():
        if prefix in haystack:
            return prices
    return None


def record_usage(
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    provider: Optional[str] = None,
    latency_ms: Optional[float] = None,
    **extra: Any,
) -> None:
    """
    Report token usage / model / latency for the LLM run currently executing.

    LangSmith reads ``usage_metadata`` from run metadata to populate the token
    and cost columns, so this is what makes the dashboard show real numbers
    instead of zeros.
    """
    run = _current_run()
    if run is None:
        return

    input_tokens = int(input_tokens or 0)
    output_tokens = int(output_tokens or 0)

    usage: Dict[str, Any] = {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
    }
    prices = _price_for(model, provider)
    if prices:
        in_price, out_price = prices
        usage["input_cost"] = round((input_tokens / 1_000_000) * in_price, 8)
        usage["output_cost"] = round((output_tokens / 1_000_000) * out_price, 8)
        usage["total_cost"] = round(usage["input_cost"] + usage["output_cost"], 8)

    metadata: Dict[str, Any] = {"usage_metadata": usage, "model": model}
    if provider:
        metadata["provider"] = provider
    if latency_ms is not None:
        metadata["latency_ms"] = round(float(latency_ms), 2)
    metadata.update({k: _sanitize(v) for k, v in extra.items()})

    try:
        run.add_metadata(metadata)
    except Exception:  # noqa: BLE001
        pass
