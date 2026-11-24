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
_GENERIC_TABLE_KEYS = {
    "event", "particular", "details", "rule id", "id", "columns", "table",
    "definition", "action", "handling",
}

NO_INFORMATION_ANSWER = (
    "I couldn't find that in the university documents right now. "
    "Try asking about attendance, fees, timetable, hostel rules, events or courses — "
    "or check with your department for the latest update."
)

_MONTHS = (
    "January|February|March|April|May|June|July|August|September|October|November|December"
)
_DATE_VALUE = rf"\d{{1,2}}[^\d\s]{{0,3}}\s+(?:{_MONTHS})\s*,?\s*\d{{2,4}}"
_DATE_RE = rf"\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*{_DATE_VALUE}\b"
_TIME_RE = r"\b\d{1,2}:\d{2}\s*(?:AM|PM)\b"
_PERCENT_RE = r"\b\d+(?:\.\d+)?\s*%"

# Calendar tables are OCR'd as adjacent lines ("Diwali", "20th October,25
# (Monday)") rather than clean sentences. Match ordinals, two-digit years and
# an optional weekday so the exact cell can be turned into a direct answer.
_CALENDAR_DATE_RE = re.compile(
    rf"(?P<day>\d{{1,2}}[^\d\s]{{0,3}})\s+(?P<month>{_MONTHS})\s*,?\s*"
    rf"(?P<year>\d{{2,4}})?\s*(?:\((?P<weekday>[A-Za-z]+)\))?",
    re.I,
)

# Named events get priority over generic long words like "academic calendar".
# The keys are matched against the question; values are the display labels.
_KNOWN_DATE_EVENTS = {
    "diwali": "Diwali",
    "deepawali": "Deepawali",
    "edm fest": "EDM Fest",
    "govardhan puja": "Govardhan Puja",
    "bhai duj": "Bhai Duj",
    "guru nanak jayanti": "Guru Nanak Jayanti",
    "parent teacher meeting": "Parent Teacher Meeting",
    "parents teacher meeting": "Parent Teacher Meeting",
    "mid term exam": "Mid Term Exam",
    "end semester examination": "End Semester Examination",
    "last day of teaching": "Last Day of Teaching",
    "winter break": "Winter Break",
    "summer break": "Summer Break",
    "christmas": "Christmas",
    "convocation": "Convocation",
    "result declaration": "Result Declaration",
    "holi": "Holi",
    "eid": "Eid",
    "new year": "New Year",
}

_QUESTION_NOISE = {
    "academic", "calendar", "hisab", "se", "ki", "hai", "kab", "kya",
    "kyo", "kahan", "kaise", "kitne", "university", "univ", "date", "time",
    "tell", "please", "about", "krmu", "college", "sir", "maam",
    "last", "first", "next", "upcoming", "deadline", "submission", "last date",
}


def _normalise_calendar_date(match: re.Match) -> str:
    """Render an OCR-friendly date match as ``20 October 2025 (Monday)``."""
    day = re.sub(r"\D", "", match.group("day"))[:2]
    month = match.group("month").title()
    year_raw = match.group("year")
    year = ""
    if year_raw:
        year_number = int(year_raw)
        if year_number < 100:
            year_number += 2000
        year = str(year_number)
    weekday = match.group("weekday")
    parts = [str(int(day)), month]
    if year:
        parts.append(year)
    date_text = " ".join(parts)
    if weekday:
        date_text += f" ({weekday.title()})"
    return date_text


def _clean_date_text(value: str) -> str:
    """Normalise an ordinal/two-digit-year date extracted from OCR text."""
    match = _CALENDAR_DATE_RE.search(value)
    return _normalise_calendar_date(match) if match else value.strip()


def _has_known_date_event(question: str) -> bool:
    lower = question.lower()
    return any(
        re.search(rf"\b{re.escape(term)}\b", lower)
        for term in _KNOWN_DATE_EVENTS
    )


def _question_event_terms(question: str) -> List[tuple[str, str]]:
    """Return ``(search term, display label)`` pairs, named events first."""
    lower = question.lower()
    terms: List[tuple[str, str]] = []
    for term, label in _KNOWN_DATE_EVENTS.items():
        if re.search(rf"\b{re.escape(term)}\b", lower):
            terms.append((term, label))
    if terms:
        return terms

    for token in re.findall(r"[a-zA-Z][a-zA-Z'\-]{2,}", lower):
        token = token.strip()
        if len(token) < 4 or token in _QUESTION_NOISE or token in _STOP_WORDS:
            continue
        terms.append((token, token.title()))
    return terms


def _date_near_term(text: str, term: str) -> Optional[str]:
    """Find a calendar date in the same row as ``term`` (OCR or prose)."""
    flat = " ".join(text.split())
    for match in re.finditer(re.escape(term), flat, re.I):
        after = flat[match.end(): match.end() + 160]
        date = _CALENDAR_DATE_RE.search(after)
        if date:
            return _normalise_calendar_date(date)
        before = flat[max(0, match.start() - 120): match.start()]
        earlier = list(_CALENDAR_DATE_RE.finditer(before))
        if earlier:
            return _normalise_calendar_date(earlier[-1])

    # Scanned tables often keep the event and date on separate OCR lines.
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        if not re.search(re.escape(term), line, re.I):
            continue
        window = " ".join(lines[index:index + 3])
        date = _CALENDAR_DATE_RE.search(window)
        if date:
            return _normalise_calendar_date(date)
        previous = " ".join(lines[max(0, index - 2):index + 1])
        earlier = list(_CALENDAR_DATE_RE.finditer(previous))
        if earlier:
            return _normalise_calendar_date(earlier[-1])
    return None


def _extract_event_date(question: str, documents: List[RankedDocument]) -> Optional[str]:
    """Answer event-date questions such as "diwali kab ki hai" from the calendar."""
    for term, label in _question_event_terms(question):
        for document in documents[:6]:
            date_text = _date_near_term(document.content, term)
            if date_text:
                return f"{label} is on {date_text}."
    return None


def _extract_direct_answer(question: str, documents: List[RankedDocument]) -> Optional[str]:
    """Pull a single unambiguous date/time/percentage from document text.

    Prose chunks often split a sentence across "K.R." or a table boundary. A
    direct regex answer is both cleaner and more reliable than returning the
    surrounding broken fragment.
    """
    question_lower = question.lower()

    # Event names must be anchored before the generic "first date in chunk"
    # rule, otherwise a calendar row returns the header or the previous event.
    event_answer = _extract_event_date(question, documents)
    if event_answer:
        return event_answer
    # A known event with no matching date in the retrieved chunks must not fall
    # through to "first date in chunk" — that is how calendar headers were
    # returned instead of the event's own date.
    if _has_known_date_event(question):
        return None

    wants_date = bool(re.search(r"\b(when|date|deadline|kab|kabse)\b", question_lower))
    for document in documents[:6]:
        text = " ".join(document.content.split())

        if wants_date:
            # "Last date" must not resolve to the first date in the chunk,
            # which is often the fee window's *opening* date.
            if "last date" in question_lower:
                for occurrence in re.finditer(r"last date", text, re.I):
                    window = text[occurrence.end(): occurrence.end() + 200]
                    ocr_date = _CALENDAR_DATE_RE.search(window)
                    if ocr_date:
                        return f"Last date: {_normalise_calendar_date(ocr_date)}"
                    plain_date = re.search(_DATE_VALUE, window, re.I)
                    if plain_date:
                        return f"Last date: {_clean_date_text(plain_date.group(0))}"
            match = re.search(_DATE_RE, text, re.I)
            if match:
                return f"Date: {_clean_date_text(match.group(0))}"

        if re.search(r"\b(time|timings|curfew)\b", question_lower):
            match = re.search(_TIME_RE, text, re.I)
            if match:
                hostel = re.search(r"(?:Boys'|Girls')\s+Hostel", text, re.I)
                prefix = f"{hostel.group(0)} — " if hostel else ""
                return f"{prefix}Time: {match.group(0).upper()}"

        if "minimum" in question_lower and "attendance" in question_lower:
            match = re.search(_PERCENT_RE, text)
            if match:
                return f"Minimum attendance: {match.group(0)}"
    return None


def _table_candidates(content: str) -> List[str]:
    """Turn PDF/DOCX table rows into clean, answerable ``Label: Value`` lines.

    Raw chunks contain strings like ``Event: Date, EDM Fest 2026: Saturday,
    26 September 2026 Event: Highlight, ...``. Returning that verbatim produced
    broken answers; splitting it into rows lets the scorer pick the single
    relevant field.
    """
    cleaned = re.sub(
        r"\bTABLE\s+\d+\s*\(Columns:[^)]*\)\s*:?",
        " ",
        content,
        flags=re.I,
    )
    # Split on any Title-Cased Label: pattern, so document-specific labels such
    # as "EDM Fest 2026:" are handled as well as the generic table headers.
    parts = re.split(r"(?=\b[A-Z][A-Za-z0-9 &'\-]{1,40}:\s)", cleaned)

    fields: List[tuple] = []
    for part in parts:
        part = part.strip(" ,;")
        if ":" not in part:
            continue
        key, value = part.split(":", 1)
        key, value = key.strip(), value.strip(" ,;")
        if key and value and len(value) < 300:
            fields.append((key, value))
    if not fields:
        return []

    rows: List[List[tuple]] = []
    current: List[tuple] = []
    for key, value in fields:
        lower = key.lower()
        starts_row = lower in {"particular", "rule id", "id", "band"}
        repeats_event = lower == "event" and any(k.lower() == "event" for k, _ in current)
        if current and (starts_row or repeats_event):
            rows.append(current)
            current = []
        current.append((key, value))
    if current:
        rows.append(current)

    candidates: List[str] = []
    for row in rows:
        values = {key.lower(): value for key, value in row}
        if "criterion" in values and "value" in values:
            candidates.append(f"{values['criterion']}: {values['value']}")
            continue
        if "residence" in values and (
            "standard return time" in values or "time" in values
        ):
            key = "standard return time" if "standard return time" in values else "time"
            label = "Standard Return Time" if key == "standard return time" else "Return Time"
            candidates.append(f"{values['residence']} — {label}: {values[key]}")
            continue
        if "particular" in values and "details" in values:
            candidates.append(f"{values['particular']}: {values['details']}")
            continue
        if "band" in values and "status" in values:
            detail = " ".join(
                part for part in (values.get("range"), values.get("action")) if part
            )
            candidates.append(
                f"{values['band']} ({values.get('range', '')}): {values['status']}"
                + (f" — {detail}" if detail else "")
            )
            continue
        pairs = [
            f"{key}: {value}" for key, value in row
            if key.lower() not in _GENERIC_TABLE_KEYS
        ]
        if pairs:
            candidates.append(" ".join(pairs))
    return candidates


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

    candidates: list[tuple[float, int, int, str, RankedDocument, bool]] = []
    for doc_rank, document in enumerate(document_list):
        content = re.sub(
            r"\bTABLE\s+\d+\s*\(Columns:[^)]*\)\s*:?",
            " ",
            document.content,
            flags=re.I,
        )

        segments: list[tuple[str, bool]] = []
        for field in _table_candidates(content):
            segments.append((field, True))
        for sentence in re.split(r"(?<=[.!?])\s+|\n+", content):
            sentence = " ".join(sentence.split())
            if sentence and all(sentence not in existing for existing, _ in segments):
                segments.append((sentence, False))

        for index, (segment, is_table) in enumerate(segments):
            if len(segment) < 8:
                continue
            lower = re.sub(r"\s+", " ", segment.lower())
            sentence_words = set(re.findall(r"[a-zA-Z0-9]{3,}", lower))
            overlap = len(query_words & sentence_words)
            phrase_hits = sum(
                1 for first, second in query_bigrams if f"{first} {second}" in lower
            )
            raw_table_marker = any(marker in lower for marker in _TABLE_ROW_MARKERS)
            # Clean table fields get a bonus because they are already concise
            # and answer-shaped; raw table rows get a penalty.
            table_penalty = -2 if is_table else (-3 if raw_table_marker else 0)
            format_bonus = 2 if is_table else 0
            number_bonus = (
                3
                if wants_number and re.search(r"\d+(?:\.\d+)?\s*%|\b\d{1,2}:\d{2}\s*(?:AM|PM)\b", segment, re.I)
                else 0
            )
            score = (
                overlap
                + (3 * phrase_hits)
                + number_bonus
                + table_penalty
                + format_bonus
                - (0.2 * doc_rank)
                - (0.1 * index)
            )
            if score > 0:
                candidates.append(
                    (score, -doc_rank, -index, segment, document, is_table)
                )

    if not candidates:
        return None

    candidates.sort(reverse=True, key=lambda item: item[:3])
    _, _, _, best_segment, best_doc, best_is_table = candidates[0]
    excerpt = best_segment

    # Extend narrative answers with one adjacent sentence. Table answers are
    # already complete — appending sibling rows would add unrelated facts.
    if not best_is_table:
        for candidate in candidates[1:]:
            if candidate[4].chunk_id != best_doc.chunk_id or candidate[0] < 2:
                continue
            if candidate[5]:
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

    direct = _extract_direct_answer(question, documents)
    if direct:
        source_doc = documents[0]
        return AgentResponse(
            answer=direct,
            confidence=max(0.85, _clamp(source_doc.similarity_score)),
            sources=[
                Source(
                    filename=source_doc.metadata.source_file,
                    doc_type=source_doc.metadata.doc_type,
                    relevance=_clamp(source_doc.similarity_score),
                )
            ],
            follow_up_questions=[],
            retrieval_used=True,
            tool_used=tool_result.tool_name if tool_result and tool_result.success else None,
            tool_result=tool_result.data if tool_result and tool_result.success else None,
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
