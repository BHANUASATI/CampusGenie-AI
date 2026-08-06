"""
Intent Classification Agent
=============================
LangGraph node that classifies user intent using Gemini Flash.

Returns a ClassificationResult with:
  - intent type
  - confidence score
  - whether retrieval is needed
  - whether a tool call is needed
  - the refined search query for ChromaDB
"""

from __future__ import annotations

import json
import re
from typing import Any

import google.generativeai as genai

from ai_engine.core.config import ai_config
from ai_engine.core.exceptions import InvalidIntentError, LLMError
from ai_engine.core.logging import Timer, get_logger, log_llm_call
from ai_engine.llm.client import call_llm
from ai_engine.prompts.intent_prompt import build_intent_prompt
from ai_engine.schemas.agent_state import AgentState
from ai_engine.schemas.intent import (
    ClassificationResult,
    IntentType,
    INTENT_NEEDS_RETRIEVAL,
    INTENT_NEEDS_TOOL,
    INTENT_TOOL_MAP,
)

logger = get_logger(__name__)


def _parse_classification_json(raw: str) -> ClassificationResult:
    """
    Parse the LLM's JSON output into a ClassificationResult.
    Handles common LLM formatting issues (markdown fences, trailing commas).
    """
    # Strip markdown fences if present
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Remove trailing commas before } or ]
    cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise InvalidIntentError(
            f"Failed to parse intent JSON: {e}",
            {"raw_response": raw[:200]},
        ) from e

    # Validate and coerce intent
    try:
        intent = IntentType(data.get("intent", "unknown"))
    except ValueError:
        intent = IntentType.UNKNOWN

    confidence = float(data.get("confidence", 0.5))
    
    # Use schema-defined defaults if LLM omits the flags
    needs_retrieval = data.get("needs_retrieval", INTENT_NEEDS_RETRIEVAL.get(intent, False))
    needs_tool = data.get("needs_tool", INTENT_NEEDS_TOOL.get(intent, False))
    suggested_tool = data.get("suggested_tool") or INTENT_TOOL_MAP.get(intent)
    retrieval_query = data.get("retrieval_query", "") or ""
    reasoning = data.get("reasoning", "")

    # If retrieval_query is empty but retrieval is needed, use the user message
    # (will be filled by caller)
    
    return ClassificationResult(
        intent=intent,
        confidence=confidence,
        needs_retrieval=bool(needs_retrieval),
        needs_tool=bool(needs_tool),
        suggested_tool=suggested_tool if suggested_tool != "null" else None,
        retrieval_query=retrieval_query,
        reasoning=reasoning,
    )


def classify_intent_node(state: AgentState) -> AgentState:
    """
    LangGraph node: Classify user intent.

    Makes a lightweight Gemini API call with a tightly-scoped prompt.
    Falls back to UNKNOWN intent on any error.

    Args:
        state: Current agent state

    Returns:
        Updated state with classification, intent, needs_retrieval, needs_tool, etc.
    """
    user_message = state["user_message"]
    trace_id = state.get("trace_id", "")

    logger.info(
        "intent.classify.start",
        extra={
            "event": "intent.classify.start",
            "user_message": user_message[:100],
            "trace_id": trace_id,
        },
    )

    prompt = build_intent_prompt(user_message)

    try:
        with Timer() as t:
            llm_result = call_llm(
                prompt=prompt,
                model_override=ai_config.GEMINI_FAST_MODEL,
                temperature=0.0,    # deterministic for classification
                max_tokens=512,     # intent JSON is small
            )

        raw_text = llm_result.text

        if llm_result.fallback_used:
            logger.warning(
                "intent.classify.fallback_used",
                extra={
                    "event": "intent.classify.fallback_used",
                    "provider": llm_result.provider,
                    "gemini_error": llm_result.error_before_fallback,
                    "trace_id": trace_id,
                },
            )

        log_llm_call(
            logger=logger,
            model=llm_result.model,
            prompt_tokens=llm_result.prompt_tokens,
            completion_tokens=llm_result.completion_tokens,
            latency_ms=t.elapsed_ms,
            node_name="classify_intent",
        )

        result = _parse_classification_json(raw_text)

        # Fallback: if retrieval_query is empty, use user message
        if not result.retrieval_query:
            result = result.model_copy(update={"retrieval_query": user_message})

        logger.info(
            "intent.classify.done",
            extra={
                "event": "intent.classify.done",
                "intent": result.intent.value,
                "confidence": result.confidence,
                "needs_retrieval": result.needs_retrieval,
                "needs_tool": result.needs_tool,
                "trace_id": trace_id,
            },
        )

        return {
            **state,
            "classification": result,
            "intent": result.intent,
            "intent_confidence": result.confidence,
            "needs_retrieval": result.needs_retrieval,
            "needs_tool": result.needs_tool,
            "suggested_tool": result.suggested_tool,
            "retrieval_query": result.retrieval_query,
            "execution_trace": state.get("execution_trace", []) + ["classify_intent"],
        }

    except Exception as e:
        logger.error(
            "intent.classify.failed",
            extra={"error": str(e), "trace_id": trace_id},
        )
        # Graceful degradation: treat as general_academic, trigger retrieval
        fallback = ClassificationResult(
            intent=IntentType.UNKNOWN,
            confidence=0.0,
            needs_retrieval=True,
            needs_tool=False,
            suggested_tool=None,
            retrieval_query=user_message,
            reasoning="Classification failed — falling back to retrieval",
        )
        return {
            **state,
            "classification": fallback,
            "intent": IntentType.UNKNOWN,
            "intent_confidence": 0.0,
            "needs_retrieval": True,
            "needs_tool": False,
            "suggested_tool": None,
            "retrieval_query": user_message,
            "error": str(e),
            "execution_trace": state.get("execution_trace", []) + ["classify_intent(fallback)"],
        }
