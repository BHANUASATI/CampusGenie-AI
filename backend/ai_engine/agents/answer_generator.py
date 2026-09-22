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
from typing import Any, Dict, Iterator, List

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


def _balanced_json_regions(text: str) -> Iterator[str]:
    """Yield the fullest balance-checked { ... } regions, in order found.

    Unlike a greedy regex this handles responses that contain several JSON
    objects or prose that happens to include braces.
    """
    start = None
    depth = 0
    in_string = False
    escape = False
    for i, ch in enumerate(text):
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and start is not None:
                    yield text[start : i + 1]
                    start = None


def _parse_answer_json(raw: str) -> Dict[str, Any]:
    """
    Parse the LLM's JSON output into an answer dict, tolerating common
    formatting failures:
      - markdown code fences
      - trailing commas
      - extra prose around the JSON object
      - the model returning a plain markdown answer instead of JSON
      - truncated JSON (salvage whatever complete fields exist)
    """
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)

    # Try the whole (fence-stripped) response as JSON first
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    # Otherwise try each balanced { ... } region in order; take the first
    # that parses and carries an "answer" key.
    for region in _balanced_json_regions(cleaned):
        try:
            data = json.loads(region)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and "answer" in data:
            return _coerce_answer_fields(data, raw)

    # Truncated JSON: salvage the complete fields we can find.  The answer
    # string regex deliberately tolerates an unterminated string (the model's
    # output can be cut off mid-value by max_output_tokens).
    data: Dict[str, Any] = {}
    for field_name in ("answer", "confidence", "sources", "follow_up_questions"):
        if field_name == "answer":
            pattern = r'"(?:answer|Answer)"\s*:\s*("(?:[^"\\]|\\.)*)'
        else:
            pattern = (
                rf'"{field_name}"\s*:\s*'
                r'("(?:[^"\\]|\\.)*"|true|false|null|-?\d+(?:\.\d+)?|\[[^\]]*\])'
            )
        m = re.search(pattern, cleaned)
        if m:
            raw_val = m.group(1)
            try:
                data[field_name] = json.loads(raw_val)
            except (json.JSONDecodeError, ValueError):
                data[field_name] = raw_val.strip('"')
            if field_name == "answer":
                # json.loads on an unterminated string raises — keep the text
                # as-is so the student still gets the partial answer.
                if not isinstance(data["answer"], str) or not data["answer"]:
                    data["answer"] = raw_val.strip('"') if raw_val.strip('"') else raw

    if not data:
        # The model ignored the JSON contract and wrote a plain markdown
        # answer.  Treat the whole response as the answer.
        logger.info("answer.parse.markdown_fallback")
        return {
            "answer": raw.strip(),
            "confidence": 0.5,
            "sources": [],
            "follow_up_questions": [],
        }

    return _coerce_answer_fields(data, raw)


def _coerce_answer_fields(data: Dict[str, Any], raw: str) -> Dict[str, Any]:
    """Normalise parsed fields and guarantee the answer is a plain string."""
    answer = data.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        # A list/dict answer (or an empty one) is a model error — keep the
        # full raw response so the student still sees something useful.
        data["answer"] = raw.strip()
    data.setdefault("confidence", 0.5)
    data.setdefault("sources", [])
    data.setdefault("follow_up_questions", [])
    return data


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

    # Fast mode keeps answers grounded in the local database/vector store and
    # avoids an unpredictable remote-model round trip.  It is deliberately
    # limited to live tool data and cited source excerpts; anything else uses
    # the existing full LLM path when fast mode is disabled.
    if ai_config.FAST_RESPONSE_MODE:
        from ai_engine.services.fast_response import build_fast_response

        with Timer() as t:
            fast_response = build_fast_response(
                question=user_message,
                documents=retrieved_docs,
                tool_result=tool_result_obj,
            )
        if fast_response:
            response = fast_response.model_copy(
                update={
                    "intent_detected": intent.value if intent else "unknown",
                    "execution_trace": state.get("execution_trace", []) + ["generate_answer(fast)"],
                    "total_latency_ms": t.elapsed_ms,
                }
            )
            logger.info(
                "answer.generate.fast_done",
                extra={
                    "event": "answer.generate.fast_done",
                    "sources_count": len(response.sources),
                    "latency_ms": t.elapsed_ms,
                    "trace_id": trace_id,
                },
            )
            return {**state, "agent_response": response}
    
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
            # Use the configured LLM provider directly instead of always trying Gemini first
            if ai_config.LLM_PROVIDER == "openrouter":
                # Call OpenRouter directly to avoid Gemini fallback delay
                from ai_engine.llm.client import _call_openrouter
                llm_result = _call_openrouter(
                    prompt=full_prompt,
                    temperature=ai_config.LLM_TEMPERATURE,
                    max_tokens=ai_config.GEMINI_MAX_OUTPUT_TOKENS,
                )
            else:
                # Use standard call_llm with Gemini fallback
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

        # Improve confidence scoring based on retrieval quality
        if retrieved_docs and confidence < 0.6:
            # Boost confidence if we have good retrieval results
            avg_rerank_score = sum(doc.rerank_score for doc in retrieved_docs) / len(retrieved_docs)
            if avg_rerank_score > 0.3:
                confidence = max(confidence, 0.6)
            elif avg_rerank_score > 0.0:
                confidence = max(confidence, 0.5)

        # Add low-confidence warning if needed (lowered threshold from 0.6 to 0.4)
        if confidence < 0.4:
            answer_text = add_low_confidence_warning(answer_text)

        # Build Source objects with actual relevance scores from retrieval
        sources = []
        for i, source_name in enumerate(sources_list):
            if isinstance(source_name, str):
                # Try to find matching document for relevance score
                relevance = 0.8  # default
                for doc in retrieved_docs:
                    if doc.metadata.source_file == source_name:
                        # Clamp rerank_score to [0.0, 1.0] — cross-encoder scores are unbounded
                        relevance = min(1.0, max(0.0, doc.rerank_score))
                        break
                sources.append(
                    Source(
                        filename=source_name,
                        doc_type="document",
                        relevance=relevance,
                    )
                )

        # If LLM didn't provide sources but we have retrieved docs, add them
        if not sources and retrieved_docs:
            for doc in retrieved_docs[:3]:  # Add top 3 retrieved docs
                sources.append(
                    Source(
                        filename=doc.metadata.source_file,
                        doc_type=doc.metadata.doc_type,
                        # Clamp rerank_score to [0.0, 1.0]
                        relevance=min(1.0, max(0.0, doc.rerank_score)),
                    )
                )

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

        # Fall back to the local grounded answer builder so the student still
        # gets a sourced answer even when the remote LLM errors out or is slow.
        try:
            from ai_engine.services.fast_response import build_fast_response

            fast_response = build_fast_response(
                question=user_message,
                documents=retrieved_docs,
                tool_result=tool_result_obj,
            )
        except Exception:
            fast_response = None

        if fast_response:
            fallback = fast_response.model_copy(
                update={
                    "intent_detected": intent.value if intent else "unknown",
                    "execution_trace": state.get("execution_trace", [])
                    + ["generate_answer(llm_failed->fast)"],
                    "total_latency_ms": 0.0,
                }
            )
            return {**state, "agent_response": fallback, "error": str(e)}

        # Last-resort generic message (no documents available to build from)
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
