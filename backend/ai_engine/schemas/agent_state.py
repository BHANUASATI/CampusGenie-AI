"""
LangGraph Agent State
======================
The single typed state object that flows through every node in the graph.

LangGraph merges state after parallel branches.
- List fields written by parallel branches use Annotated[list, operator.add]
  so both contributions are concatenated.
- Fields that are set once at input and never mutated by nodes use
  Annotated[T, keep_last] so LangGraph accepts the identical value from
  both parallel branches without raising InvalidUpdateError.
- All other fields use last-write-wins (default LangGraph behaviour).

Design rule: nodes READ what they need, WRITE what they produce.
No node should mutate fields it didn't produce.
"""

from __future__ import annotations

import operator
from typing import Annotated, Any, Dict, List, Optional

from typing_extensions import TypedDict

from ai_engine.schemas.intent import ClassificationResult, IntentType
from ai_engine.schemas.retrieval import RankedDocument, RetrievalResult
from ai_engine.schemas.response import AgentResponse, ToolResult


# ---------------------------------------------------------------------------
# Custom reducer: keep the last (or only) value — used for immutable inputs
# that both parallel branches will carry unchanged.
# ---------------------------------------------------------------------------
def _keep_last(old: Any, new: Any) -> Any:   # noqa: ANN001
    """Always accept the incoming value (last-write-wins, no conflict)."""
    return new


class ConversationMessage(TypedDict):
    """A single turn in the conversation history."""
    sender_type: str   # "user" | "ai"
    content: str


class UserContext(TypedDict, total=False):
    """
    Verified user context extracted from the JWT / DB lookup.
    total=False makes all keys optional at construction time
    (we always supply all keys, but this prevents TypedDict strict errors).
    """
    user_id: int
    role: str                    # student | faculty | admin | registrar
    name: str
    department: Optional[str]
    semester: Optional[int]
    student_id: Optional[int]    # DB primary key in students table
    enrollment_number: Optional[str]


class AgentState(TypedDict, total=False):
    """
    Shared state for the entire LangGraph execution.
    total=False: all keys are optional at construction — nodes add keys as they run.

    Parallel branches (retrieve_context + tool_call) both carry all state keys.
    - execution_trace: Annotated with operator.add  → lists are concatenated.
    - Input fields set once (user_message, conversation_id, user_context,
      trace_id) and classification outputs: Annotated with _keep_last
      so parallel branches don't conflict on merge.
    """

    # -----------------------------------------------------------------------
    # Input  (set once at graph entry, never mutated)
    # Annotated with _keep_last so parallel branches don't conflict.
    # -----------------------------------------------------------------------
    user_message: Annotated[str, _keep_last]
    conversation_id: Annotated[int, _keep_last]
    user_context: Annotated[UserContext, _keep_last]
    trace_id: Annotated[str, _keep_last]

    # -----------------------------------------------------------------------
    # Memory  (written by load_memory_node)
    # -----------------------------------------------------------------------
    conversation_history: Annotated[List[ConversationMessage], _keep_last]
    session_memory: Annotated[Dict[str, Any], _keep_last]

    # -----------------------------------------------------------------------
    # Classification  (written by classify_intent_node, read by all later nodes)
    # -----------------------------------------------------------------------
    classification: Annotated[Optional[ClassificationResult], _keep_last]
    intent: Annotated[Optional[IntentType], _keep_last]
    intent_confidence: Annotated[Optional[float], _keep_last]
    needs_retrieval: Annotated[Optional[bool], _keep_last]
    needs_tool: Annotated[Optional[bool], _keep_last]
    suggested_tool: Annotated[Optional[str], _keep_last]
    retrieval_query: Annotated[Optional[str], _keep_last]

    # -----------------------------------------------------------------------
    # Retrieval  (written by retrieve_context_node)
    # Annotated with _keep_last so parallel branches don't conflict
    # -----------------------------------------------------------------------
    retrieval_result: Annotated[Optional[RetrievalResult], _keep_last]
    retrieved_documents: Annotated[Optional[List[RankedDocument]], _keep_last]

    # -----------------------------------------------------------------------
    # Tool calling  (written by tool_call_node)
    # Annotated with _keep_last so parallel branches don't conflict
    # -----------------------------------------------------------------------
    tool_result: Annotated[Optional[ToolResult], _keep_last]

    # -----------------------------------------------------------------------
    # Answer  (written by generate_answer_node)
    # Annotated with _keep_last for consistency
    # -----------------------------------------------------------------------
    agent_response: Annotated[Optional[AgentResponse], _keep_last]

    # -----------------------------------------------------------------------
    # Memory save  (written by save_memory_node)
    # Annotated with _keep_last for consistency
    # -----------------------------------------------------------------------
    memory_saved: Annotated[Optional[bool], _keep_last]

    # Private: persisted DB objects returned from save_memory_node
    _saved_user_msg: Annotated[Optional[Any], _keep_last]
    _saved_ai_msg: Annotated[Optional[Any], _keep_last]

    # -----------------------------------------------------------------------
    # Control / observability
    # execution_trace uses operator.add so parallel nodes both contribute
    # error uses _keep_last so a node error isn't lost on merge
    # -----------------------------------------------------------------------
    error: Annotated[Optional[str], _keep_last]
    execution_trace: Annotated[List[str], operator.add]
