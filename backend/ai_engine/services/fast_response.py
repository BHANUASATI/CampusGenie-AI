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
# Tesseract renders ordinals from scans in many ways: 20th, 22™4, 234 (23rd),
# 31S, 01%. Keep the leading 1-2 real digits and discard the OCR noise later.
_DAY_TOKEN = r"\d{1,2}(?:[^\d\s]{0,3}\d{1,2})?[^\d\s]{0,3}"
_DATE_VALUE = rf"{_DAY_TOKEN}\s+(?:{_MONTHS})\s*,?\s*\d{{2,4}}"
_DATE_RE = rf"\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*{_DATE_VALUE}\b"
_TIME_RE = r"\b\d{1,2}:\d{2}\s*(?:AM|PM)\b"
_PERCENT_RE = r"\b\d+(?:\.\d+)?\s*%"

# Calendar tables are OCR'd as adjacent lines ("Diwali", "20th October,25
# (Monday)") rather than clean sentences. Match ordinals, two-digit years and
# an optional weekday so the exact cell can be turned into a direct answer.
_CALENDAR_DATE_RE = re.compile(
    rf"(?P<day>{_DAY_TOKEN})\s+(?P<month>{_MONTHS})\s*,?\s*"
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


# (answer, source filename, doc type, relevance) — carrying the source prevents
# a calendar answer from being cited with the timetable chunk that was ranked
# first by mistake.
DirectAnswer = tuple[str, str, str, float]


def _document_source(document) -> tuple[str, str, float]:
    """Extract citation fields from a ranked or retrieved document."""
    metadata = document.metadata
    relevance = max(
        getattr(document, "similarity_score", 0.0),
        getattr(document, "rerank_score", 0.0),
    )
    return metadata.source_file, metadata.doc_type, _clamp(relevance)


def _has_known_date_event(question: str) -> bool:
    lower = question.lower()
    return any(
        re.search(rf"\b{re.escape(term)}\b", lower)
        for term in _KNOWN_DATE_EVENTS
    )


def _question_event_terms(question: str) -> List[tuple[str, str]]:
    """Return ``(search term, display label)`` pairs for named calendar events.

    We deliberately do *not* fall back to generic question words: treating a
    word like "hostel" or "October" as an event makes the answer extractor grab
    an unrelated nearby date from any document.
    """
    lower = question.lower()
    return [
        (term, label)
        for term, label in _KNOWN_DATE_EVENTS.items()
        if re.search(rf"\b{re.escape(term)}\b", lower)
    ]


def _date_near_term(text: str, term: str) -> Optional[str]:
    """Return the calendar date closest to ``term`` in either direction.

    Tesseract frequently emits a table row as ``20 October,25\n21 | Diwali``
    (date *before* the event). Always reading the following 160 characters
    then picked the next row's date, which is why scanned calendars answered
    with the wrong festival date. Nearest-date-wins handles both layouts.
    """
    dates = [
        (match.start(), match.end(), _normalise_calendar_date(match))
        for match in _CALENDAR_DATE_RE.finditer(text)
    ]
    if not dates:
        return None

    best: Optional[tuple[int, str]] = None
    for term_match in re.finditer(re.escape(term), text, re.I):
        term_start, term_end = term_match.span()
        for date_start, date_end, value in dates:
            if date_end <= term_start:
                distance = term_start - date_end
            elif date_start >= term_end:
                distance = date_start - term_end
            else:
                continue
            if distance > 160:
                continue
            if best is None or distance < best[0]:
                best = (distance, value)
    return best[1] if best else None


def _extract_event_date(question: str, documents: List[RankedDocument]) -> Optional[DirectAnswer]:
    """Answer event-date questions such as "diwali kab ki hai" from the calendar."""
    terms = _question_event_terms(question)
    for term, label in terms:
        for document in documents[:6]:
            date_text = _date_near_term(document.content, term)
            if date_text:
                source_file, doc_type, relevance = _document_source(document)
                return f"{label} is on {date_text}.", source_file, doc_type, relevance

    # The retriever can still surface a different document first (e.g. the
    # Master Timetable). Ask the local vector store directly for that event's
    # calendar row before giving up — this stays fast and keeps the answer
    # grounded in the indexed PDF.
    if terms:
        try:
            from ai_engine.vectorstore.manager import get_vector_store

            store = get_vector_store()
            for term, label in terms:
                for probe in (f"{term} academic calendar date", f"{term} holiday"):
                    for result in store.search(query=probe, top_k=5):
                        date_text = _date_near_term(result.content, term)
                        if date_text:
                            source_file, doc_type, relevance = _document_source(result)
                            return f"{label} is on {date_text}.", source_file, doc_type, relevance
        except Exception:
            pass
    return None


def _extract_direct_answer(question: str, documents: List[RankedDocument]) -> Optional[DirectAnswer]:
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

    # Search every retrieved chunk for an explicit "Last date" before falling
    # back to the first date anywhere in the first chunk — a calendar row in
    # position 0 must not swallow a fee-notice answer.
    if wants_date and "last date" in question_lower:
        for document in documents[:6]:
            text = " ".join(document.content.split())
            source_file, doc_type, relevance = _document_source(document)
            for occurrence in re.finditer(r"last date", text, re.I):
                window = text[occurrence.end(): occurrence.end() + 200]
                ocr_date = _CALENDAR_DATE_RE.search(window)
                if ocr_date:
                    return f"Last date: {_normalise_calendar_date(ocr_date)}", source_file, doc_type, relevance
                plain_date = re.search(_DATE_VALUE, window, re.I)
                if plain_date:
                    return f"Last date: {_clean_date_text(plain_date.group(0))}", source_file, doc_type, relevance

    for document in documents[:6]:
        text = " ".join(document.content.split())

        source_file, doc_type, relevance = _document_source(document)

        if wants_date:
            match = re.search(_DATE_RE, text, re.I)
            if match:
                return f"Date: {_clean_date_text(match.group(0))}", source_file, doc_type, relevance

        if re.search(r"\b(time|timings|curfew)\b", question_lower):
            match = re.search(_TIME_RE, text, re.I)
            if match:
                hostel = re.search(r"(?:Boys'|Girls')\s+Hostel", text, re.I)
                prefix = f"{hostel.group(0)} — " if hostel else ""
                return f"{prefix}Time: {match.group(0).upper()}", source_file, doc_type, relevance

        if "minimum" in question_lower and "attendance" in question_lower:
            match = re.search(_PERCENT_RE, text)
            if match:
                return f"Minimum attendance: {match.group(0)}", source_file, doc_type, relevance
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


def format_tool_result_answer(tool_result: Optional[ToolResult]) -> Optional[str]:
    """Present complete live DB data without asking a remote model to restate it.

    This is the only local answer path used in normal operation: the data comes
    straight from MySQL, so formatting it locally is both exact and instant.
    """
    if tool_result is None:
        return None
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


# Backwards-compatible private alias used by older callers/tests.
_format_tool_answer = format_tool_result_answer


def build_llm_fallback_response(
    question: str,
    documents: List[RankedDocument],
    tool_result: Optional[ToolResult],
) -> Optional[AgentResponse]:
    """Last-resort answer when the remote LLM fails or times out.

    Unlike ``build_fast_response`` this never presents a cherry-picked fragment
    as a confident fact: it explicitly labels the text as the closest matching
    excerpt and points the student at the source to verify.
    """
    tool_answer = format_tool_result_answer(tool_result)
    if tool_answer:
        return AgentResponse(
            answer=tool_answer,
            confidence=0.95,
            sources=[],
            follow_up_questions=[],
            retrieval_used=bool(documents),
            tool_used=tool_result.tool_name if tool_result else None,
            tool_result=tool_result.data if tool_result else None,
        )

    selected = _select_sentences(question, documents)
    if not selected:
        return None
    excerpt, document = selected
    source_file, doc_type, relevance = _document_source(document)
    return AgentResponse(
        answer=(
            f"The AI service is unavailable right now. The closest matching "
            f"excerpt I found is: \"{excerpt}\" — please verify it in "
            f"[{source_file}]."
        ),
        confidence=0.4,
        sources=[Source(filename=source_file, doc_type=doc_type, relevance=relevance)],
        follow_up_questions=[],
        retrieval_used=True,
        tool_used=None,
    )


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
        answer, source_file, doc_type, relevance = direct
        return AgentResponse(
            answer=answer,
            confidence=max(0.85, relevance),
            sources=[
                Source(
                    filename=source_file,
                    doc_type=doc_type,
                    relevance=relevance,
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
