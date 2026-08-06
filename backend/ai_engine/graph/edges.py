"""
LangGraph Conditional Edge Functions
=====================================
These functions read the agent state and decide which nodes to execute next.
"""

from __future__ import annotations

from typing import List, Literal

from ai_engine.schemas.agent_state import AgentState
from ai_engine.schemas.intent import IntentType


def route_after_classification(state: AgentState) -> List[str]:
    """
    After intent classification, decide which nodes run in parallel.
    
    Returns a list of node names to fan out to.
    LangGraph will execute all nodes in the list concurrently.
    """
    nodes = []

    intent = state.get("intent", IntentType.UNKNOWN)

    # Short-circuit: greetings need neither retrieval nor tools
    if intent == IntentType.GREETING:
        return ["generate_answer"]

    if state.get("needs_retrieval", False):
        nodes.append("retrieve_context")

    if state.get("needs_tool", False):
        nodes.append("tool_call")

    # If neither branch is needed, go straight to generation
    if not nodes:
        return ["generate_answer"]

    return nodes


def route_after_parallel(state: AgentState) -> Literal["generate_answer"]:
    """
    After retrieval + tool calling (possibly parallel), always generate answer.
    This is a simple pass-through — LangGraph uses it to merge parallel branches.
    """
    return "generate_answer"


def route_after_generation(state: AgentState) -> Literal["save_memory"]:
    """
    After answer generation, always save to memory.
    """
    return "save_memory"
