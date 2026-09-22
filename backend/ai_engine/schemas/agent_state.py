"""
LangGraph Agent State
======================
The single typed state object that flows through every node in the graph.

LangGraph merges state after parallel branches.
- execution_trace is append-only: Annotated[List[str], _trace_reducer]
  (prefix-aware — see the reducer below).
- Fields that are set once at input and never mutated by nodes use
  Annotated[T, keep_last] so LangGraph accepts the identical value from
  both parallel branches without raising InvalidUpdateError.
- Result fields produced by parallel branches (retrieval_result,
  retrieved_documents, tool_result) use _keep_first_real so a stale None
  re-emitted by the sibling branch cannot clobber a real result.
- All other fields use last-write-wins (default LangGraph behaviour).

Design rule: nodes READ what they need, WRITE what they produce.
No node should mutate fields it didn't produce.
"""

from __future__ import annotations

from typing import Annotated, Any, Dict, List, Optional

from typing_extensions import TypedDict

from ai_engine.schemas.intent import ClassificationResult, IntentType
from ai_engine.schemas.retrieval import RankedDocument, RetrievalResult
from ai_engine.schemas.response import AgentResponse, ToolResult


# ---------------------------------------------------------------------------
# Custom reducers for parallel branch merges.
# ---------------------------------------------------------------------------
def _keep_last(old: Any, new: Any) -> Any:   # noqa: ANN001
    """Always accept the incoming value (last-write-wins, no conflict)."""
    return new


def _keep_first_real(old: Any, new: Any) -> Any:   # noqa: ANN001
    """
    Prefer whichever value is actually populated.

    In a parallel superstep (retrieve_context + tool_call both running), the
    branch that finishes last also writes the *input* value for keys it did
    not produce — e.g. tool_call re-emits ``retrieved_documents: None`` while
    retrieval is (concurrently) producing the real list.  ``_keep_last`` then
    lets that stale ``None`` clobber the genuine result, so timetable
    questions (needs_retrieval AND needs_tool) reached the answer generator
    with zero documents.  This reducer keeps the populated value instead.
    """
    return new if new is not None else old


def _trace_reducer(old: List[str], new: List[str]) -> List[str]:
    """
    Append-only execution trace that survives LangGraph's repeated reduction.

    Every node returns ``{**state, 'execution_trace': old_trace + [node]}``, so
    the incoming ``new`` list already contains the full accumulated history.
    ``operator.add`` concatenated the whole list with itself at each step,
    exponentially duplicating e.g. ``load_memory load_memory classify_intent``
    entries.  Sequential updates are supersets of the old trace; parallel
    branches share a common prefix plus one entry — handle both.
    """
    if not old:
        return list(new)
    if not new:
        return list(old)
    if len(new) > len(old) and new[: len(old)] == old:
        return list(new)
    # Parallel branch: both lists start with the same prefix.
    m = 0
    for a, b in zip(old, new):
        if a == b:
            m += 1
        else:
            break
    if m and m < len(new):
        return list(old) + list(new[m:])
    return list(new) if len(new) >= len(old) else list(old)


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
    - execution_trace: Annotated with _trace_reducer  → prefix-aware append.
    - Input fields set once (user_message, conversation_id, user_context,
      trace_id) and classification outputs: Annotated with _keep_last
      so parallel branches don't conflict on merge.
    - Result fields produced by parallel branches (retrieval_result,
      retrieved_documents, tool_result): Annotated with _keep_first_real so a
      stale None re-emitted by the sibling branch cannot clobber a real result.
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
    # Retrieval + Tool  (written by parallel branches)
    # Both retrieve_context_node and tool_call_node re-emit the *input* value
    # for keys they did not produce, so these use _keep_first_real: a real
    # result from one branch must not be clobbered by a stale None/empty value
    # carried through by the other.
    # -----------------------------------------------------------------------
    retrieval_result: Annotated[Optional[RetrievalResult], _keep_first_real]
    retrieved_documents: Annotated[Optional[List[RankedDocument]], _keep_first_real]
    tool_result: Annotated[Optional[ToolResult], _keep_first_real]

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
    # execution_trace uses _trace_reducer (prefix-aware append) so parallel
    # nodes both contribute without duplicate-accumulation.
    # error uses _keep_last so a node error isn't lost on merge
    # -----------------------------------------------------------------------
    error: Annotated[Optional[str], _keep_last]
    execution_trace: Annotated[List[str], _trace_reducer]
