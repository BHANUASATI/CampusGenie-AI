"""
Answer Generation Agent
========================
LangGraph node that generates the final answer using RAG.

Calls Gemini 2.5 Flash with:
  - System prompt (personality + rules)
  - Retrieved context (reranked documents from ChromaDB)
  - Tool results (live DB data)
  - Conversation history
  - User question

Returns structured JSON: answer, confidence, sources, follow_up_questions.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from ai_engine.core.config import ai_config
from ai_engine.core.logging import Timer, get_logger, log_llm_call
from ai_engine.llm.client import call_llm
from ai_engine.prompts.rag_prompt import build_rag_prompt
from ai_engine.prompts.safety_prompt import (
    GREETING_RESPONSE,
    NO_INFORMATION_RESPONSE,
    add_low_confidence_warning,
)
from ai_engine.prompts.system_prompt import build_system_prompt
from ai_engine.schemas.agent_state import AgentState
from ai_engine.schemas.intent import IntentType
from ai_engine.schemas.response import AgentResponse
from ai_engine.schemas.retrieval import Source

logger = get_logger(__name__)


def _parse_answer_json(raw: str) -> Dict[str, Any]:
    """Parse LLM's JSON output, handling markdown fences and trailing commas."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)
    
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error("answer.parse_failed", extra={"error": str(e), "raw": raw[:300]})
        # Return a fallback structure
        return {
            "answer": raw,
            "confidence": 0.5,
            "sources": [],
            "follow_up_questions": [],
        }


def generate_answer_node(state: AgentState) -> AgentState:
    """
    LangGraph node: Generate final answer using RAG.

    Special cases:
      - If intent is GREETING → return canned greeting
      - If no documents and no tool result → return "no information" response
      - If confidence < 0.6 → prepend warning

    Args:
        state: Current agent state

    Returns:
        Updated state with agent_response populated
    """
    intent = state.get("intent", IntentType.UNKNOWN)
    user_message = state["user_message"]
    user_context = state["user_context"]
    retrieved_docs = state.get("retrieved_documents") or []
    tool_result_obj = state.get("tool_result")
    conversation_history = state.get("conversation_history", [])
    trace_id = state.get("trace_id", "")

    logger.info(
        "answer.generate.start",
        extra={
            "event": "answer.generate.start",
            "intent": intent.value if intent else "none",
            "docs_count": len(retrieved_docs),
            "has_tool_result": tool_result_obj is not None,
            "trace_id": trace_id,
        },
    )

    # -----------------------------------------------------------------------
    # Special case 1: Greeting
    # Show a short welcome message. No confidence bar (it's a canned response,
    # not an answer), and no generic follow-up suggestions — let the user ask
    # their real question naturally.
    # -----------------------------------------------------------------------
    if intent == IntentType.GREETING:
        response = AgentResponse(
            answer=GREETING_RESPONSE,
            confidence=None,          # suppresses the confidence bar in the UI
            sources=[],
            follow_up_questions=[],   # no generic suggestions on greeting
            intent_detected=intent.value,
            retrieval_used=False,
            tool_used=None,
            execution_trace=state.get("execution_trace", []) + ["generate_answer(greeting)"],
            total_latency_ms=0.0,
        )
        return {**state, "agent_response": response}

    # -----------------------------------------------------------------------
    # Special case 2: No context available
    # -----------------------------------------------------------------------
    has_context = bool(retrieved_docs) or (tool_result_obj and tool_result_obj.success)
    if not has_context:
        response = AgentResponse(
            answer=NO_INFORMATION_RESPONSE,
            confidence=0.0,
            sources=[],
            follow_up_questions=[],
            intent_detected=intent.value if intent else "unknown",
            retrieval_used=len(retrieved_docs) > 0,
            tool_used=tool_result_obj.tool_name if tool_result_obj else None,
            execution_trace=state.get("execution_trace", []) + ["generate_answer(no_context)"],
            total_latency_ms=0.0,
        )
        return {**state, "agent_response": response}

    # -----------------------------------------------------------------------
    # Main path: RAG answer generation
    # -----------------------------------------------------------------------
    
    # Build tool result dict for prompt
    tool_result_dict = None
    if tool_result_obj and tool_result_obj.success:
        tool_result_dict = {
            "tool_name": tool_result_obj.tool_name,
            "data": tool_result_obj.data,
        }

    # Build full RAG prompt
    prompt = build_rag_prompt(
        user_question=user_message,
        documents=retrieved_docs,
        tool_result=tool_result_dict,
        conversation_history=conversation_history,
    )

    # Add system prompt (prepended to RAG prompt)
    system_prompt_text = build_system_prompt(user_context)
    full_prompt = system_prompt_text + "\n\n" + prompt

    try:
        with Timer() as t:
            llm_result = call_llm(
                prompt=full_prompt,
                model_override=ai_config.GEMINI_CHAT_MODEL,
                temperature=ai_config.GEMINI_TEMPERATURE,
                max_tokens=ai_config.GEMINI_MAX_OUTPUT_TOKENS,
            )

        raw_text = llm_result.text

        if llm_result.fallback_used:
            logger.warning(
                "answer.generate.fallback_used",
                extra={
                    "event": "answer.generate.fallback_used",
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
            node_name="generate_answer",
        )

        parsed = _parse_answer_json(raw_text)
        answer_text = parsed.get("answer", raw_text)
        confidence = float(parsed.get("confidence", 0.7))
        sources_list = parsed.get("sources", [])
        follow_up = parsed.get("follow_up_questions", [])

        # Add low-confidence warning if needed (lowered threshold from 0.6 to 0.4)
        if confidence < 0.4:
            answer_text = add_low_confidence_warning(answer_text)

        # Build Source objects
        sources = [
            Source(
                filename=s,
                doc_type="document",
                relevance=0.8,  # approximate, could be derived from rerank scores
            )
            for s in sources_list
            if isinstance(s, str)
        ]

        response = AgentResponse(
            answer=answer_text,
            confidence=confidence,
            sources=sources,
            follow_up_questions=follow_up[:3],  # limit to 3
            intent_detected=intent.value if intent else "unknown",
            retrieval_used=len(retrieved_docs) > 0,
            tool_used=tool_result_obj.tool_name if tool_result_obj else None,
            tool_result=tool_result_dict,
            execution_trace=state.get("execution_trace", []) + ["generate_answer"],
            total_latency_ms=t.elapsed_ms,
        )

        logger.info(
            "answer.generate.done",
            extra={
                "event": "answer.generate.done",
                "confidence": confidence,
                "sources_count": len(sources),
                "latency_ms": t.elapsed_ms,
                "trace_id": trace_id,
            },
        )

        return {**state, "agent_response": response}

    except Exception as e:
        logger.error("answer.generate.failed", extra={"error": str(e), "trace_id": trace_id})
        
        # Graceful fallback
        fallback = AgentResponse(
            answer="I encountered an error while generating a response. Please try asking your question again.",
            confidence=0.0,
            sources=[],
            follow_up_questions=[],
            intent_detected=intent.value if intent else "unknown",
            retrieval_used=len(retrieved_docs) > 0,
            tool_used=tool_result_obj.tool_name if tool_result_obj else None,
            execution_trace=state.get("execution_trace", []) + ["generate_answer(error)"],
            total_latency_ms=0.0,
        )
        return {
            **state,
            "agent_response": fallback,
            "error": str(e),
        }
