"""Low-latency, deterministic routing for common CampusGenie requests."""

from __future__ import annotations

import re

from ai_engine.schemas.intent import (
    ClassificationResult,
    IntentType,
    INTENT_NEEDS_RETRIEVAL,
    INTENT_NEEDS_TOOL,
    INTENT_TOOL_MAP,
)


_GREETING_RE = re.compile(
    r"^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening)|"
    r"thanks?|thank\s+you|bye|goodbye)[!,.\s]*$",
    re.IGNORECASE,
)

_KEYWORD_RULES: tuple[tuple[IntentType, tuple[str, ...]], ...] = (
    (IntentType.ATTENDANCE_QUERY, ("attendance", "attend", "absent", "present", "eligibility")),
    (IntentType.ASSIGNMENT_QUERY, ("assignment", "assignments", "deadline", "deadlines", "submission", "task due")),
    (IntentType.NOTICE_QUERY, ("notice", "notices", "announcement", "announcements", "circular", "event")),
    (IntentType.FACULTY_QUERY, ("faculty", "professor", "lecturer", "teacher", "office hour", "contact")),
    (IntentType.PLACEMENT_QUERY, ("placement", "placements", "internship", "internships", "package", "recruiter")),
    (IntentType.POLICY_QUERY, ("policy", "policies", "regulation", "regulations", "scholarship", "fee", "fees", "refund")),
    (IntentType.COURSE_QUERY, ("course", "courses", "credit", "credits", "prerequisite", "curriculum", "syllabus", "enrolled")),
    (IntentType.EXAM_QUERY, ("exam", "exams", "grade", "grades", "result", "results", "mark", "marks", "seating")),
    (IntentType.TIMETABLE_QUERY, ("timetable", "class schedule", "class time", "room number", "time slot")),
)

_GENERAL_ACADEMIC_MARKERS = (
    "study tip",
    "study plan",
    "how should i study",
    "help me study",
    "teach me",
    "explain the concept",
)


def _needs_live_tool(intent: IntentType, normalized_message: str) -> bool:
    """Only call a personal-data tool when the wording asks for live data."""
    if intent == IntentType.ATTENDANCE_QUERY:
        return any(marker in normalized_message for marker in ("my attendance", "current attendance", "attendance percentage"))
    if intent == IntentType.COURSE_QUERY:
        return any(marker in normalized_message for marker in ("my course", "my courses", "enrolled", "am i taking"))
    if intent == IntentType.NOTICE_QUERY:
        return any(marker in normalized_message for marker in ("latest", "recent", "active notice", "active notices"))
    if intent == IntentType.ASSIGNMENT_QUERY:
        return any(marker in normalized_message for marker in ("my assignment", "my assignments", "my deadline", "my deadlines", "upcoming"))
    if intent == IntentType.FACULTY_QUERY:
        return any(marker in normalized_message for marker in ("contact", "email", "phone", "office hour"))
    return False


def classify_fast_intent(message: str) -> ClassificationResult:
    """Classify an obvious request locally, avoiding a network LLM call.

    Ambiguous messages intentionally use ``unknown`` so the existing retrieval
    pipeline can still find university documents rather than guessing a tool.
    """
    normalized = " ".join(message.lower().split())

    if _GREETING_RE.fullmatch(normalized):
        intent = IntentType.GREETING
        confidence = 0.99
        reasoning = "Matched a short conversational greeting."
    else:
        intent = IntentType.UNKNOWN
        confidence = 0.65
        reasoning = "No unambiguous academic keyword matched; search the knowledge base."

        for candidate_intent, keywords in _KEYWORD_RULES:
            if any(keyword in normalized for keyword in keywords):
                intent = candidate_intent
                confidence = 0.92
                reasoning = f"Matched {candidate_intent.value} keywords."
                break
        else:
            if any(marker in normalized for marker in _GENERAL_ACADEMIC_MARKERS):
                intent = IntentType.GENERAL_ACADEMIC
                confidence = 0.85
                reasoning = "Matched a general academic-help phrase."

    return ClassificationResult(
        intent=intent,
        confidence=confidence,
        needs_retrieval=INTENT_NEEDS_RETRIEVAL[intent],
        needs_tool=INTENT_NEEDS_TOOL[intent] and _needs_live_tool(intent, normalized),
        suggested_tool=INTENT_TOOL_MAP.get(intent)
        if INTENT_NEEDS_TOOL[intent] and _needs_live_tool(intent, normalized)
        else None,
        retrieval_query="" if intent == IntentType.GREETING else message,
        reasoning=reasoning,
    )
