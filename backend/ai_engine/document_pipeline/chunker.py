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
from ai_engine.document_pipeline.table_markers import TABLE_END_MARKER, TABLE_START_MARKER

logger = get_logger(__name__)

# Approximate char:token ratio for English academic text
CHARS_PER_TOKEN = 4

_CHUNK_SIZE_CHARS = ai_config.CHUNK_SIZE * CHARS_PER_TOKEN         # 768 * 4 = 3072
_CHUNK_OVERLAP_CHARS = ai_config.CHUNK_OVERLAP * CHARS_PER_TOKEN   # 100 * 4 = 400


def _chunk_table_block(block_lines: List[str], rows_per_chunk: int) -> List[str]:
    """Split one marked table block into row-group chunks."""
    if not block_lines:
        return []
    header = block_lines[0] if block_lines[0].startswith("TABLE ") else None
    rows = [ln for ln in block_lines[1 if header else 0:] if ln.strip()]
    if not rows:
        return [header] if header else []

    groups = [rows[i:i + rows_per_chunk] for i in range(0, len(rows), rows_per_chunk)]
    chunks = []
    for group in groups:
        parts = [header] if header else []
        parts.extend(group)
        chunks.append("\n".join(parts))
    return chunks


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
    rows_per_chunk = max(1, ai_config.TABLE_ROWS_PER_CHUNK)
    all_chunks: List[str] = []
    all_metadatas: List[Dict[str, Any]] = []

    def add_chunks(chunk_texts: List[str], page_num: int) -> None:
        for chunk_text in chunk_texts:
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

    for page_num, text in pages:
        if TABLE_START_MARKER not in text:
            add_chunks(splitter.split_text(text), page_num)
            continue

        # Table-aware pass: prose goes to the generic splitter; marked table
        # blocks become row-group chunks so embeddings stay crisp.
        prose: List[str] = []
        block: List[str] = []
        in_table = False
        for line in text.split("\n"):
            if line == TABLE_START_MARKER:
                if prose:
                    add_chunks(splitter.split_text("\n".join(prose)), page_num)
                    prose = []
                in_table = True
                block = []
            elif line == TABLE_END_MARKER:
                in_table = False
                add_chunks(_chunk_table_block(block, rows_per_chunk), page_num)
            elif in_table:
                block.append(line)
            else:
                prose.append(line)
        if prose:
            add_chunks(splitter.split_text("\n".join(prose)), page_num)

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
