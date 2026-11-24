"""
Document Text Extractor
========================
Extracts raw text from supported file formats:
  .pdf   — PyMuPDF (fitz)    — preserves reading order, handles multi-column
  .docx  — python-docx       — paragraphs + tables
  .txt   — direct read       — UTF-8 with fallback encoding detection
  .csv   — pandas            — converts rows to readable sentences
  .md    — direct read       — treated as plain text

Each extractor returns a list of (page_or_section_number, text) tuples
so the chunker can attach page metadata to chunks.
"""

from __future__ import annotations

import csv
import io
import os
import re
from pathlib import Path
from typing import List, Tuple

from ai_engine.core.config import ai_config
from ai_engine.core.exceptions import DocumentProcessingError
from ai_engine.core.logging import get_logger
from ai_engine.document_pipeline.table_markers import TABLE_END_MARKER, TABLE_START_MARKER

logger = get_logger(__name__)

# Type alias: list of (page_number, text) pairs.  page_number = -1 if not applicable.
PagedText = List[Tuple[int, str]]


# ---------------------------------------------------------------------------
# PDF Extractor
# ---------------------------------------------------------------------------
def _ocr_page(fitz, page, language: str, dpi: int) -> str:
    """Render one PDF page and recognise its text with Tesseract.

    Rotation detection is best-effort: a scanned page fed in sideways is still
    readable after a 90/180/270 degree correction.
    """
    import pytesseract
    from PIL import Image

    scale = max(1.0, float(dpi) / 72.0)
    pixmap = page.get_pixmap(
        matrix=fitz.Matrix(scale, scale),
        colorspace=fitz.csGRAY,
        alpha=False,
    )
    image = Image.open(io.BytesIO(pixmap.tobytes("png")))

    try:
        osd = pytesseract.image_to_osd(image)
        angle_match = re.search(r"Rotate:\s*(\d+)", osd)
        angle = int(angle_match.group(1)) if angle_match else 0
        if angle:
            image = image.rotate(-angle, expand=True)
    except Exception:
        # OSD language data is optional; continue with the unrotated image.
        pass

    return pytesseract.image_to_string(
        image, lang=language, config=f"--psm {ai_config.OCR_PSM}"
    )


def extract_pdf(file_path: str) -> PagedText:
    """
    Extract text from a PDF using PyMuPDF, with automatic OCR fallback.

    Digital PDFs use the embedded text layer (fast, exact). Pages with little
    or no text are rendered at OCR_DPI and read with Tesseract, so image-only
    scanned documents become searchable without any manual pre-processing.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError as e:
        raise DocumentProcessingError(
            "PyMuPDF not installed. Run: pip install pymupdf", {"error": str(e)}
        ) from e

    pages: PagedText = []
    ocr_pages: List[int] = []
    ocr_failures: List[int] = []
    try:
        doc = fitz.open(file_path)
        for page_num, page in enumerate(doc, start=1):
            native_text = page.get_text("text") or ""
            needs_ocr = (
                ai_config.OCR_ENABLED
                and len(native_text.strip()) < ai_config.OCR_MIN_TEXT_CHARS
            )

            text = native_text
            if needs_ocr:
                try:
                    ocr_text = _ocr_page(
                        fitz,
                        page,
                        language=ai_config.OCR_LANGUAGE,
                        dpi=ai_config.OCR_DPI,
                    )
                except Exception as exc:
                    ocr_text = ""
                    ocr_failures.append(page_num)
                    logger.warning(
                        "extractor.ocr_failed",
                        extra={
                            "file": Path(file_path).name,
                            "page": page_num,
                            "error": str(exc),
                        },
                    )
                if ocr_text.strip():
                    text = ocr_text
                    ocr_pages.append(page_num)
                else:
                    logger.warning(
                        "extractor.ocr_empty",
                        extra={"file": Path(file_path).name, "page": page_num},
                    )

            if text.strip():
                pages.append((page_num, text))
            else:
                logger.warning(
                    "extractor.empty_page",
                    extra={"file": Path(file_path).name, "page": page_num},
                )
        doc.close()
    except DocumentProcessingError:
        raise
    except Exception as e:
        raise DocumentProcessingError(
            f"Failed to extract PDF: {Path(file_path).name}", {"error": str(e)}
        ) from e

    if not pages:
        hint = (
            "Tesseract could not read any page. Check OCR_LANGUAGE / tesseract "
            "language packs, or upload a clearer scan."
            if ocr_failures or ocr_pages
            else "No text layer or readable image content was found."
        )
        raise DocumentProcessingError(
            f"PDF appears to be empty or unreadable: {Path(file_path).name}",
            {"hint": hint, "ocr_pages": ocr_pages, "ocr_failures": ocr_failures},
        )

    logger.info(
        "extractor.pdf_done",
        extra={
            "event": "extractor.pdf_done",
            "file": Path(file_path).name,
            "pages": len(pages),
            "ocr_pages": ocr_pages,
            "ocr_failures": ocr_failures,
        },
    )
    return pages


# ---------------------------------------------------------------------------
# DOCX Extractor
# ---------------------------------------------------------------------------
_DAY_NAMES = {"monday", "tuesday", "wednesday", "thursday", "friday",
              "saturday", "sunday"}
_TIME_RE = re.compile(r"^\s*\d{1,2}:\d{2}", re.IGNORECASE)
_ROOM_RE = re.compile(r"^\s*[A-Za-z]+-\d{2,4}\s*$")


def _looks_like_header_row(cells: List[str]) -> bool:
    """Heuristic: a table row is column labels (vs a data row) when it has no
    time values, no day-of-week values and no room codes."""
    vals = [c.strip() for c in cells if c.strip()]
    if len(vals) < 2:
        return True
    for v in vals:
        if _TIME_RE.match(v) or v.lower() in _DAY_NAMES or _ROOM_RE.match(v):
            return False
    return True


def _extract_table_rows(table) -> List[List[str]]:
    """Return per-row cell text with merged-cell duplicates collapsed once."""
    rows: List[List[str]] = []
    for row in table.rows:
        cells: List[str] = []
        prev = None
        for cell in row.cells:
            text = " ".join(cell.text.strip().split())  # collapse newlines/ws
            if text == prev:  # merged cell repeated across columns
                continue
            cells.append(text)
            prev = text
        rows.append(cells)
    return rows


def _render_table_with_headers(rows: List[List[str]], index: int) -> str:
    """Render a table so every row is self-describing.  This is what makes
    timetable/fee/room tables retrievable: a row becomes
    ``Day: Wednesday, Time: 09:00-10:00, Subject: Research Methodology, ...``
    instead of an ambiguous ``Wednesday | 09:00-10:00 | ...`` pipe line."""
    # Locate the header row: the first row that is not a data row.
    header_row = 0
    for i, r in enumerate(rows):
        if _looks_like_header_row(r):
            header_row = i
            break

    max_cols = max(len(r) for r in rows)
    header = [c.strip() for c in rows[header_row]]
    col_labels = header if len(header) >= 2 and _looks_like_header_row(header) \
        else [f"Column {j}" for j in range(1, max_cols + 1)]

    lines = [f"TABLE {index} (Columns: {' | '.join(col_labels)}):"]
    for r in rows:
        if r == rows[header_row]:
            continue  # header consumed as labels
        pairs = []
        for j, cell in enumerate(r):
            label = col_labels[j] if j < len(col_labels) else f"Column {j + 1}"
            if cell.strip():
                pairs.append(f"{label}: {cell.strip()}")
        if pairs:
            lines.append(", ".join(pairs))
    return "\n".join(lines)


def extract_docx(file_path: str) -> PagedText:
    """
    Extract text from a .docx file.
    Returns paragraphs grouped into ~100-paragraph pages for metadata purposes.
    """
    try:
        from docx import Document
    except ImportError as e:
        raise DocumentProcessingError(
            "python-docx not installed. Run: pip install python-docx", {"error": str(e)}
        ) from e

    try:
        doc = Document(file_path)
        paragraphs: List[str] = []

        # Extract paragraph text
        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                paragraphs.append(text)

        # Extract tables as structured, self-describing blocks.
        # Tables flattened to bare pipe-rows are not retrievable — a model
        # cannot tell which column is the room, time, subject, etc.
        # Each table is wrapped in sentinel markers so the chunker can split
        # it into small row-groups instead of diluting row embeddings in one
        # giant 3000-char paragraph.
        for i, table in enumerate(doc.tables, start=1):
            rows = _extract_table_rows(table)
            if not rows:
                continue
            rendered = _render_table_with_headers(rows, i)
            if rendered.strip():
                paragraphs.append(f"{TABLE_START_MARKER}\n{rendered}\n{TABLE_END_MARKER}")

        if not paragraphs:
            raise DocumentProcessingError(f"DOCX appears empty: {Path(file_path).name}")

        # Group into virtual pages of 100 paragraphs
        pages: PagedText = []
        chunk_size = 100
        for i in range(0, len(paragraphs), chunk_size):
            page_text = "\n".join(paragraphs[i:i + chunk_size])
            pages.append((i // chunk_size + 1, page_text))

        return pages

    except DocumentProcessingError:
        raise
    except Exception as e:
        raise DocumentProcessingError(
            f"Failed to extract DOCX: {Path(file_path).name}", {"error": str(e)}
        ) from e


# ---------------------------------------------------------------------------
# TXT Extractor
# ---------------------------------------------------------------------------
def extract_txt(file_path: str) -> PagedText:
    """
    Extract text from a plain text file.
    Tries UTF-8 then falls back to latin-1.
    """
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            with open(file_path, "r", encoding=encoding) as f:
                text = f.read()
            if text.strip():
                return [(-1, text)]
        except (UnicodeDecodeError, LookupError):
            continue

    raise DocumentProcessingError(
        f"Could not decode TXT file: {Path(file_path).name}",
        {"tried_encodings": ["utf-8", "utf-8-sig", "latin-1", "cp1252"]},
    )


# ---------------------------------------------------------------------------
# CSV Extractor
# ---------------------------------------------------------------------------
def extract_csv(file_path: str) -> PagedText:
    """
    Extract data from CSV as readable prose sentences.
    Each row becomes: "Column1: value1, Column2: value2, ..."
    """
    rows_text: List[str] = []
    try:
        with open(file_path, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=1):
                parts = [f"{k}: {v}" for k, v in row.items() if v and v.strip()]
                if parts:
                    rows_text.append(", ".join(parts))
    except Exception as e:
        raise DocumentProcessingError(
            f"Failed to extract CSV: {Path(file_path).name}", {"error": str(e)}
        ) from e

    if not rows_text:
        raise DocumentProcessingError(f"CSV appears empty: {Path(file_path).name}")

    # Group into virtual pages of 200 rows
    pages: PagedText = []
    chunk_size = 200
    for i in range(0, len(rows_text), chunk_size):
        page_text = "\n".join(rows_text[i:i + chunk_size])
        pages.append((i // chunk_size + 1, page_text))

    return pages


# ---------------------------------------------------------------------------
# Markdown Extractor
# ---------------------------------------------------------------------------
def extract_md(file_path: str) -> PagedText:
    """Extract markdown as plain text — sections become virtual pages."""
    text = extract_txt(file_path)[0][1]

    # Split on H1/H2 headings to create sections
    import re
    sections = re.split(r"(?m)^#{1,2}\s+", text)
    pages: PagedText = []
    for i, section in enumerate(sections, start=1):
        if section.strip():
            pages.append((i, section.strip()))

    return pages if pages else [(-1, text)]


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------
_EXTRACTORS = {
    ".pdf":  extract_pdf,
    ".docx": extract_docx,
    ".txt":  extract_txt,
    ".csv":  extract_csv,
    ".md":   extract_md,
}


def extract_text(file_path: str) -> PagedText:
    """
    Dispatch to the correct extractor based on file extension.

    Args:
        file_path: Absolute path to the file

    Returns:
        List of (page_number, text) tuples

    Raises:
        DocumentProcessingError: if extension not supported or extraction fails
    """
    ext = Path(file_path).suffix.lower()
    extractor = _EXTRACTORS.get(ext)

    if extractor is None:
        raise DocumentProcessingError(
            f"Unsupported file format: {ext}",
            {"supported": list(_EXTRACTORS.keys()), "file": Path(file_path).name},
        )

    logger.info(
        "extractor.start",
        extra={
            "event": "extractor.start",
            "file": Path(file_path).name,
            "extension": ext,
            "size_bytes": os.path.getsize(file_path),
        },
    )

    pages = extractor(file_path)

    logger.info(
        "extractor.done",
        extra={
            "event": "extractor.done",
            "file": Path(file_path).name,
            "pages_extracted": len(pages),
        },
    )

    return pages
