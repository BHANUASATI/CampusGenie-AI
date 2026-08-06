"""
Text Cleaner
============
Normalizes extracted raw text before chunking:
  - Remove excessive whitespace (including form feeds, vertical tabs)
  - Remove page headers/footers (if they repeat across pages)
  - Remove non-printable characters except newlines
  - Fix encoding artifacts (smart quotes, em-dashes, etc.)
  - Normalize unicode (NFC)
  - Remove excessively short lines (likely OCR noise)
"""

from __future__ import annotations

import re
import unicodedata
from typing import List

from ai_engine.core.logging import get_logger

logger = get_logger(__name__)


def clean_text(text: str) -> str:
    """
    Apply all cleaning transformations to a single text block.
    
    Args:
        text: Raw extracted text
    
    Returns:
        Cleaned text ready for chunking
    """
    if not text:
        return ""

    # 1. Normalize unicode (convert all to NFC canonical form)
    text = unicodedata.normalize("NFC", text)

    # 2. Fix common encoding artifacts
    replacements = {
        "\u2018": "'",   # left single quote
        "\u2019": "'",   # right single quote
        "\u201c": '"',   # left double quote
        "\u201d": '"',   # right double quote
        "\u2013": "-",   # en dash
        "\u2014": " - ", # em dash
        "\u2026": "...", # ellipsis
        "\xa0":   " ",   # non-breaking space
        "\u200b": "",    # zero-width space
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    # 3. Remove form feeds, vertical tabs, etc. (keep \n and \t)
    text = re.sub(r"[\x0b\x0c\r]+", "", text)

    # 4. Remove non-printable characters (except newline, tab)
    text = "".join(ch for ch in text if ch in ("\n", "\t") or ch.isprintable())

    # 5. Collapse multiple spaces/tabs into one
    text = re.sub(r"[ \t]+", " ", text)

    # 6. Collapse multiple newlines into at most two (preserve paragraph breaks)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # 7. Strip leading/trailing whitespace from each line
    lines = [line.strip() for line in text.split("\n")]

    # 8. Remove very short lines (likely OCR noise, page numbers, etc.)
    # Keep lines that are at least 10 chars or end with punctuation
    filtered_lines = []
    for line in lines:
        if len(line) >= 10 or (line and line[-1] in ".!?:"):
            filtered_lines.append(line)
        elif line:
            # Log short line for debugging
            logger.debug("cleaner.skipped_short_line", extra={"line": line})

    # 9. Rejoin
    text = "\n".join(filtered_lines)

    # 10. Final strip
    return text.strip()


def clean_pages(pages: List[tuple[int, str]]) -> List[tuple[int, str]]:
    """
    Clean text for each page.

    Args:
        pages: List of (page_number, raw_text) tuples

    Returns:
        List of (page_number, cleaned_text) tuples
    """
    cleaned = []
    for page_num, text in pages:
        cleaned_text = clean_text(text)
        if cleaned_text:  # only keep non-empty pages
            cleaned.append((page_num, cleaned_text))

    logger.info(
        "cleaner.done",
        extra={
            "event": "cleaner.done",
            "input_pages": len(pages),
            "output_pages": len(cleaned),
        },
    )

    return cleaned
