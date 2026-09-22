"""Local response formatting used by the one-second chat path."""

from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Optional

from ai_engine.schemas.response import AgentResponse, ToolResult
from ai_engine.schemas.retrieval import RankedDocument, Source


_STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how",
    "i", "in", "is", "it", "my", "of", "on", "or", "the", "to", "what", "when",
    "where", "which", "with", "you", "your",
}


def _clamp(value: float) -> float:
    return min(1.0, max(0.0, value))


def _format_tool_answer(tool_result: ToolResult) -> Optional[str]:
    """Present complete live DB data without asking a remote model to restate it."""
    data: Dict[str, Any] = tool_result.data or {}
    tool_name = tool_result.tool_name

    if tool_name == "get_student_attendance" and "attendance_percentage" in data:
        attendance = float(data["attendance_percentage"])
        status = "on track" if data.get("status") == "ok" else "below the required threshold"
        semester = data.get("semester")
        semester_text = f" for semester {semester}" if semester is not None else ""
        return f"Your current attendance is **{attendance:.1f}%**{semester_text}; it is {status}."

    if tool_name == "get_student_courses" and data.get("course_name"):
        code = f" ({data['course_code']})" if data.get("course_code") else ""
        semester = f", semester {data['semester']}" if data.get("semester") is not None else ""
        department = f" in {data['department']}" if data.get("department") else ""
        return f"Your enrolled course is **{data['course_name']}**{code}{department}{semester}."

    if tool_name == "get_upcoming_deadlines":
        deadlines = data.get("deadlines") or []
        if not deadlines:
            return "You have no active deadlines in the next 14 days."
        lines = ["Your upcoming deadlines:"]
        for deadline in deadlines[:5]:
            title = deadline.get("title", "Untitled task")
            due = deadline.get("due_date", "date not provided")
            lines.append(f"- **{title}** — due {due}")
        return "\n".join(lines)

    if tool_name == "get_faculty_contact":
        faculty = data.get("faculty") or []
        if not faculty:
            return "No active faculty contacts were found for your department."
        lines = ["Faculty contacts for your department:"]
        for person in faculty[:5]:
            details = " · ".join(
                str(value) for value in (person.get("designation"), person.get("email")) if value
            )
            lines.append(f"- **{person.get('name', 'Faculty member')}**{f' — {details}' if details else ''}")
        return "\n".join(lines)

    if tool_name in {"get_active_notices", "get_timetable"} and data.get("message"):
        return str(data["message"])

    return None


def _select_sentences(question: str, documents: Iterable[RankedDocument]) -> tuple[str, RankedDocument] | None:
    """Choose compact, relevant source sentences by lexical overlap."""
    document_list = list(documents)
    if not document_list:
        return None

    query_words = {
        word for word in re.findall(r"[a-zA-Z0-9]{3,}", question.lower()) if word not in _STOP_WORDS
    }
    document = document_list[0]
    sentences = [
        " ".join(sentence.split())
        for sentence in re.split(r"(?<=[.!?])\s+|\n+", document.content)
        if sentence.strip()
    ]
    if not sentences:
        return None

    scored = []
    for index, sentence in enumerate(sentences):
        sentence_words = set(re.findall(r"[a-zA-Z0-9]{3,}", sentence.lower()))
        scored.append((len(query_words & sentence_words), -index, sentence))

    scored.sort(reverse=True)
    selected = [item[2] for item in scored[:2] if item[0] > 0]
    if not selected:
        selected = [sentences[0]]
    excerpt = " ".join(selected)
    if len(excerpt) > 600:
        excerpt = excerpt[:597].rsplit(" ", 1)[0] + "…"
    return excerpt, document


def build_fast_response(
    question: str,
    documents: List[RankedDocument],
    tool_result: Optional[ToolResult],
) -> Optional[AgentResponse]:
    """Return an immediate answer from live data or indexed documents.

    The caller uses the normal LLM path whenever this function cannot form a
    grounded answer. That preserves quality mode as a configurable fallback.
    """
    if tool_result and tool_result.success:
        answer = _format_tool_answer(tool_result)
        if answer:
            return AgentResponse(
                answer=answer,
                confidence=0.95,
                sources=[],
                follow_up_questions=[],
                retrieval_used=bool(documents),
                tool_used=tool_result.tool_name,
                tool_result=tool_result.data,
            )

    selected = _select_sentences(question, documents)
    if not selected:
        return None

    excerpt, document = selected
    relevance = _clamp(max(document.similarity_score, document.rerank_score))
    source = Source(
        filename=document.metadata.source_file,
        doc_type=document.metadata.doc_type,
        relevance=relevance,
        excerpt=excerpt,
    )
    return AgentResponse(
        answer=f"According to [{source.filename}], {excerpt}",
        confidence=max(0.55, relevance),
        sources=[source],
        follow_up_questions=[],
        retrieval_used=True,
        tool_used=tool_result.tool_name if tool_result and tool_result.success else None,
        tool_result=tool_result.data if tool_result and tool_result.success else None,
    )
