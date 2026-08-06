"""
Intent Classification Schemas
==============================
All Pydantic models related to intent classification.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class IntentType(str, Enum):
    """All possible user intent categories."""

    COURSE_QUERY       = "course_query"
    ATTENDANCE_QUERY   = "attendance_query"
    PLACEMENT_QUERY    = "placement_query"
    NOTICE_QUERY       = "notice_query"
    FACULTY_QUERY      = "faculty_query"
    EXAM_QUERY         = "exam_query"
    ASSIGNMENT_QUERY   = "assignment_query"
    POLICY_QUERY       = "policy_query"
    TIMETABLE_QUERY    = "timetable_query"
    GENERAL_ACADEMIC   = "general_academic"
    GREETING           = "greeting"
    UNKNOWN            = "unknown"


# Map intent → whether ChromaDB retrieval is useful
INTENT_NEEDS_RETRIEVAL: dict[IntentType, bool] = {
    IntentType.COURSE_QUERY:      True,
    IntentType.ATTENDANCE_QUERY:  True,
    IntentType.PLACEMENT_QUERY:   True,
    IntentType.NOTICE_QUERY:      True,
    IntentType.FACULTY_QUERY:     True,
    IntentType.EXAM_QUERY:        True,
    IntentType.ASSIGNMENT_QUERY:  True,
    IntentType.POLICY_QUERY:      True,
    IntentType.TIMETABLE_QUERY:   True,
    IntentType.GENERAL_ACADEMIC:  False,
    IntentType.GREETING:          False,
    IntentType.UNKNOWN:           True,   # retrieve anyway, might find something
}

# Map intent → whether a live DB tool call is useful
INTENT_NEEDS_TOOL: dict[IntentType, bool] = {
    IntentType.COURSE_QUERY:      True,
    IntentType.ATTENDANCE_QUERY:  True,
    IntentType.PLACEMENT_QUERY:   False,
    IntentType.NOTICE_QUERY:      True,
    IntentType.FACULTY_QUERY:     True,
    IntentType.EXAM_QUERY:        False,
    IntentType.ASSIGNMENT_QUERY:  True,
    IntentType.POLICY_QUERY:      False,
    IntentType.TIMETABLE_QUERY:   False,
    IntentType.GENERAL_ACADEMIC:  False,
    IntentType.GREETING:          False,
    IntentType.UNKNOWN:           False,
}

# Map intent → suggested tool name (if needs_tool is True)
INTENT_TOOL_MAP: dict[IntentType, Optional[str]] = {
    IntentType.ATTENDANCE_QUERY:  "get_student_attendance",
    IntentType.COURSE_QUERY:      "get_student_courses",
    IntentType.NOTICE_QUERY:      "get_active_notices",
    IntentType.ASSIGNMENT_QUERY:  "get_upcoming_deadlines",
    IntentType.FACULTY_QUERY:     "get_faculty_contact",
    IntentType.TIMETABLE_QUERY:   "get_timetable",
}


class ClassificationResult(BaseModel):
    """Structured output from the Intent Classification Agent."""

    intent: IntentType = Field(..., description="Classified intent category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classification confidence 0–1")
    needs_retrieval: bool = Field(..., description="Should the Retriever Agent run?")
    needs_tool: bool = Field(..., description="Should the Tool Calling Agent run?")
    suggested_tool: Optional[str] = Field(
        None, description="Tool name to call, if needs_tool is True"
    )
    retrieval_query: str = Field(
        ...,
        description=(
            "Refined search query for ChromaDB vector search. "
            "Should be semantically richer than the raw user message."
        ),
    )
    reasoning: str = Field(
        ...,
        description="One-sentence explanation of why this intent was assigned",
    )
