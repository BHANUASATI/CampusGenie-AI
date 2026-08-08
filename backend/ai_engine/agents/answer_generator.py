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
    # -----------------------------------------------------------------------
    if intent == IntentType.GREETING:
        response = AgentResponse(
            answer=GREETING_RESPONSE,
            confidence=1.0,
            sources=[],
            follow_up_questions=[
                "What is the minimum attendance requirement?",
                "How do I check my course schedule?",
                "Who is my faculty advisor?",
            ],
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

    from ai_engine.agents.dual_lens_generator import DualLensGenerator

    try:
        with Timer() as t:
            dual_res = DualLensGenerator.generate_dual_lens_response(state)

        answer_text = dual_res["combined_answer"]
        confidence = float(dual_res.get("confidence", 0.85))
        sources_list = dual_res.get("sources", [])
        follow_up = dual_res.get("follow_up_questions", [])

        # Add low-confidence warning if needed
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
