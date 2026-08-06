"""
LangGraph Orchestrator
=======================
Builds and compiles the main agent state graph.

Graph topology:
  START
    └→ load_memory
        └→ classify_intent
            ├→ retrieve_context  (parallel, if needs_retrieval)
            ├→ tool_call         (parallel, if needs_tool)
            └→ generate_answer   (direct, if greeting/general)
                └→ generate_answer   (after parallel merge)
                    └→ save_memory
                        └→ END

The graph is compiled once at startup and reused for all requests.
"""

from __future__ import annotations

import threading
from functools import partial
from typing import TYPE_CHECKING

from langgraph.graph import END, START, StateGraph

from ai_engine.core.logging import get_logger
from ai_engine.schemas.agent_state import AgentState

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = get_logger(__name__)


def _build_graph(db: "Session"):
    """
    Build and compile the LangGraph for a single request.

    We pass `db` into stateful nodes via partial() so nodes stay pure functions.
    A new graph is compiled per-request (the compilation is cheap; the DB session
    must be per-request for SQLAlchemy thread safety).

    Args:
        db: SQLAlchemy session for this request

    Returns:
        Compiled CompiledGraph
    """
    from ai_engine.agents.memory_manager import load_memory_node, save_memory_node
    from ai_engine.agents.intent_classifier import classify_intent_node
    from ai_engine.agents.retriever import retrieve_context_node
    from ai_engine.agents.tool_caller import tool_call_node
    from ai_engine.agents.answer_generator import generate_answer_node
    from ai_engine.graph.edges import route_after_classification

    # Bind db to stateful nodes
    _load_memory = partial(load_memory_node, db=db)
    _save_memory = partial(save_memory_node, db=db)
    _tool_call = partial(tool_call_node, db=db)

    # -----------------------------------------------------------------------
    # Build the StateGraph
    # -----------------------------------------------------------------------
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("load_memory",       _load_memory)
    graph.add_node("classify_intent",   classify_intent_node)
    graph.add_node("retrieve_context",  retrieve_context_node)
    graph.add_node("tool_call",         _tool_call)
    graph.add_node("generate_answer",   generate_answer_node)
    graph.add_node("save_memory",       _save_memory)

    # Add edges
    graph.add_edge(START, "load_memory")
    graph.add_edge("load_memory", "classify_intent")

    # Conditional fan-out after classification
    graph.add_conditional_edges(
        "classify_intent",
        route_after_classification,
        {
            "retrieve_context": "retrieve_context",
            "tool_call": "tool_call",
            "generate_answer": "generate_answer",
        },
    )

    # Both parallel branches converge at generate_answer
    graph.add_edge("retrieve_context", "generate_answer")
    graph.add_edge("tool_call", "generate_answer")

    # After generation, always save memory
    graph.add_edge("generate_answer", "save_memory")
    graph.add_edge("save_memory", END)

    compiled = graph.compile()
    logger.info("orchestrator.graph_compiled", extra={"event": "orchestrator.graph_compiled"})
    return compiled


def run_agent(initial_state: AgentState, db: "Session") -> AgentState:
    """
    Execute the full LangGraph for a single chat message.

    Args:
        initial_state: Fully initialized AgentState dict
        db: SQLAlchemy session (request-scoped)

    Returns:
        Final AgentState after all nodes have executed
    """
    graph = _build_graph(db)

    logger.info(
        "orchestrator.run.start",
        extra={
            "event": "orchestrator.run.start",
            "conversation_id": initial_state.get("conversation_id"),
            "trace_id": initial_state.get("trace_id"),
        },
    )

    final_state = graph.invoke(initial_state)

    logger.info(
        "orchestrator.run.done",
        extra={
            "event": "orchestrator.run.done",
            "trace_id": initial_state.get("trace_id"),
            "execution_trace": final_state.get("execution_trace", []),
            "intent": str(final_state.get("intent", "unknown")),
            "confidence": final_state.get("agent_response", {}).get("confidence", 0.0)
            if isinstance(final_state.get("agent_response"), dict)
            else getattr(final_state.get("agent_response"), "confidence", 0.0),
        },
    )

    return final_state
