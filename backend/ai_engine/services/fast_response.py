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

# Table rows score highly on keyword overlap ("attendance", "required") but are
# not sentences a student can be answered with. Penalise them so a real policy
# sentence wins, while still allowing them to be used for band/status questions.
_TABLE_ROW_MARKERS = (
    "band:", "rule id:", "required action:", "situation:",
    "defined condition:", "table ", "columns:",
)


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
    """Pick the most answer-like sentence from the retrieved chunks.

    Ranking by raw keyword overlap alone promoted table rows ("Band: AAP-B4,
    Attendance Range: Below 45%...") over the actual rule sentence. This scorer
    rewards question phrases and numeric answers, penalises table fragments,
    and searches every retrieved chunk rather than only the first one.
    """
    document_list = list(documents)[:6]
    if not document_list:
        return None

    raw_question = question.lower()
    query_tokens = [
        word for word in re.findall(r"[a-zA-Z0-9]{3,}", raw_question)
        if word not in _STOP_WORDS
    ]
    query_words = set(query_tokens)
    # Only meaningful adjacent pairs. Including stop-word pairs such as
    # "the minimum" gave table rows a false phrase match.
    query_bigrams = {
        (query_tokens[i], query_tokens[i + 1])
        for i in range(len(query_tokens) - 1)
    }
    wants_number = any(
        marker in raw_question
        for marker in (
            "minimum", "maximum", "required", "percentage", "percent",
            "how much", "how many", "below", "above", "%",
        )
    )

    candidates: list[tuple[float, int, int, str, RankedDocument]] = []
    for doc_rank, document in enumerate(document_list):
        content = re.sub(
            r"\bTABLE\s+\d+\s*\(Columns:[^)]*\)\s*:?",
            " ",
            document.content,
            flags=re.I,
        )
        sentences = [
            " ".join(sentence.split())
            for sentence in re.split(r"(?<=[.!?])\s+|\n+", content)
            if sentence.strip()
        ]
        for index, sentence in enumerate(sentences):
            if len(sentence) < 20:
                continue
            lower = re.sub(r"\s+", " ", sentence.lower())
            sentence_words = set(re.findall(r"[a-zA-Z0-9]{3,}", lower))
            overlap = len(query_words & sentence_words)
            phrase_hits = sum(
                1 for first, second in query_bigrams if f"{first} {second}" in lower
            )
            # A moderate penalty stops table rows winning generic rule questions
            # but still lets them answer "which band is below 45%?" style asks.
            table_penalty = -3 if any(marker in lower for marker in _TABLE_ROW_MARKERS) else 0
            number_bonus = (
                3 if wants_number and re.search(r"\d+(?:\.\d+)?\s*%", sentence) else 0
            )
            score = (
                overlap
                + (2 * phrase_hits)
                + number_bonus
                + table_penalty
                - (0.2 * doc_rank)
                - (0.1 * index)
            )
            if score > 0:
                candidates.append((score, -doc_rank, -index, sentence, document))

    if not candidates:
        return None

    candidates.sort(reverse=True, key=lambda item: item[:3])
    _, _, _, best_sentence, best_doc = candidates[0]
    excerpt = best_sentence

    # Add one more useful sentence from the same document when it adds detail.
    for candidate in candidates[1:]:
        if candidate[4].chunk_id != best_doc.chunk_id or candidate[0] < 2:
            continue
        if candidate[3] not in excerpt:
            excerpt += " " + candidate[3]
        if len(excerpt) > 600:
            break

    if len(excerpt) > 600:
        excerpt = excerpt[:597].rsplit(" ", 1)[0] + "…"
    return excerpt, best_doc


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
        # The UI already renders `sources` chips, so the answer text stays
        # clean and conversational instead of embedding a filename.
        answer=excerpt,
        confidence=max(0.55, relevance),
        sources=[source],
        follow_up_questions=[],
        retrieval_used=True,
        tool_used=tool_result.tool_name if tool_result and tool_result.success else None,
        tool_result=tool_result.data if tool_result and tool_result.success else None,
    )
