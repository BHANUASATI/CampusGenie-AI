"""
Text Chunker
============
Splits cleaned text into overlapping chunks suitable for embedding.

Strategy: RecursiveCharacterTextSplitter
  - Tries to split on paragraph breaks first (\n\n)
  - Falls back to sentence endings (. ! ?)
  - Falls back to commas
  - Falls back to spaces
  - Last resort: hard character split

Why recursive?
  Splitting on \n\n preserves semantic paragraph boundaries.
  If a paragraph is too long, it recurses to sentence boundaries.
  This produces much better retrieval quality than fixed-size splits.

Chunk size: 512 tokens (~2048 characters)
Overlap: 50 tokens (~200 characters)
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from langchain_text_splitters import RecursiveCharacterTextSplitter

from ai_engine.core.config import ai_config
from ai_engine.core.logging import get_logger

logger = get_logger(__name__)

# Approximate char:token ratio for English academic text
CHARS_PER_TOKEN = 4

_CHUNK_SIZE_CHARS = ai_config.CHUNK_SIZE * CHARS_PER_TOKEN         # 512 * 4 = 2048
_CHUNK_OVERLAP_CHARS = ai_config.CHUNK_OVERLAP * CHARS_PER_TOKEN   # 50 * 4 = 200


def get_splitter() -> RecursiveCharacterTextSplitter:
    """Create and return the text splitter."""
    return RecursiveCharacterTextSplitter(
        chunk_size=_CHUNK_SIZE_CHARS,
        chunk_overlap=_CHUNK_OVERLAP_CHARS,
        length_function=len,
        separators=[
            "\n\n",    # paragraph break (highest priority)
            "\n",      # single newline
            ". ",      # sentence ending
            "! ",
            "? ",
            "; ",
            ", ",
            " ",       # word boundary
            "",        # character-level last resort
        ],
        is_separator_regex=False,
        keep_separator=False,
    )


def chunk_pages(
    pages: List[Tuple[int, str]],
    base_metadata: Dict[str, Any],
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    Chunk a list of (page_num, text) pairs into overlapping chunks.

    Args:
        pages: Cleaned page texts from the cleaner
        base_metadata: Metadata common to all chunks from this document
                       (source_file, doc_type, department, semester, ...)

    Returns:
        (chunks, metadatas) — parallel lists for ChromaDB upsert
    """
    splitter = get_splitter()
    all_chunks: List[str] = []
    all_metadatas: List[Dict[str, Any]] = []

    for page_num, text in pages:
        page_chunks = splitter.split_text(text)

        for chunk_text in page_chunks:
            if not chunk_text.strip():
                continue

            chunk_meta = {
                **base_metadata,
                "page_number": page_num,
                "chunk_index": len(all_chunks),
                "total_chunks": 0,  # filled in after all chunks are collected
            }
            all_chunks.append(chunk_text)
            all_metadatas.append(chunk_meta)

    # Fill in total_chunks now that we know the final count
    total = len(all_chunks)
    for meta in all_metadatas:
        meta["total_chunks"] = total

    logger.info(
        "chunker.done",
        extra={
            "event": "chunker.done",
            "input_pages": len(pages),
            "output_chunks": total,
            "source_file": base_metadata.get("source_file", "unknown"),
        },
    )

    return all_chunks, all_metadatas
