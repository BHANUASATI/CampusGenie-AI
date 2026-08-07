"""
Document Indexer
================
Orchestrates the full ingestion pipeline:
  1. Extract text (extractor.py)
  2. Clean text (cleaner.py)
  3. Chunk text (chunker.py)
  4. Embed chunks (embeddings/model.py)
  5. Upsert to ChromaDB (vectorstore/manager.py)

This is called from the document upload API endpoint.
Long-running — should be run in a background task.
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

from ai_engine.core.exceptions import DocumentProcessingError
from ai_engine.core.logging import Timer, get_logger
from ai_engine.document_pipeline.chunker import chunk_pages
from ai_engine.document_pipeline.cleaner import clean_pages
from ai_engine.document_pipeline.extractor import extract_text
from ai_engine.vectorstore.manager import get_vector_store

logger = get_logger(__name__)


class DocumentIndexer:
    """Manages the full document ingestion pipeline."""

    def __init__(self):
        self.vector_store = get_vector_store()

    def index_document(
        self,
        file_path: str,
        source_file: str,
        doc_type: str,
        department: Optional[str] = "all",
        semester: Optional[int] = None,
        academic_year: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Index a single document.

        Args:
            file_path: Absolute path to the file on disk
            source_file: Original filename (for display in citations)
            doc_type: Document category (must be in DOC_TYPES)
            department: Department code or "all"
            semester: Relevant semester (1-8) or None for all
            academic_year: e.g. "2024-25"

        Returns:
            Dict with ingestion stats:
              {
                "document_id": str,
                "source_file": str,
                "chunks_indexed": int,
                "total_latency_ms": float,
                "extract_ms": float,
                "clean_ms": float,
                "chunk_ms": float,
                "embed_ms": float,
                "upsert_ms": float,
              }
        """
        document_id = str(uuid4())
        stats = {
            "document_id": document_id,
            "source_file": source_file,
            "chunks_indexed": 0,
        }

        with Timer() as total_timer:
            # Step 1: Extract
            with Timer() as t:
                pages = extract_text(file_path)
            stats["extract_ms"] = t.elapsed_ms

            # Step 2: Clean
            with Timer() as t:
                cleaned = clean_pages(pages)
            stats["clean_ms"] = t.elapsed_ms

            # Step 3: Chunk
            base_metadata = {
                "source_file": source_file,
                "doc_type": doc_type,
                "department": department or "all",
                "semester": semester or 0,
                "academic_year": academic_year or "unknown",
                "document_id": document_id,
                "upload_date": datetime.now().isoformat(),
            }

            with Timer() as t:
                chunks, metadatas = chunk_pages(cleaned, base_metadata)
            stats["chunk_ms"] = t.elapsed_ms

            if not chunks:
                raise DocumentProcessingError(
                    "No chunks produced — document may be empty or unreadable",
                    {"source_file": source_file},
                )

            # Step 4: Embed + Upsert (handled internally by vector_store)
            with Timer() as t:
                num_indexed = self.vector_store.upsert_chunks(
                    chunks=chunks,
                    metadatas=metadatas,
                    document_id=document_id,
                )
            stats["upsert_ms"] = t.elapsed_ms
            stats["chunks_indexed"] = num_indexed

        stats["total_latency_ms"] = total_timer.elapsed_ms

        logger.info(
            "indexer.done",
            extra={
                "event": "indexer.done",
                **stats,
            },
        )

        return stats

    def reindex_all_documents(self, document_dir: str) -> Dict[str, Any]:
        """
        Full reindex of all documents in a directory.
        Not implemented yet — placeholder for future batch reindex.

        This would:
          1. Scan directory for all supported files
          2. Index each file into a staging collection
          3. Swap staging → main atomically
        """
        raise NotImplementedError("Batch reindex not yet implemented")


def index_document_from_path(
    file_path: str,
    doc_type: str,
    department: str = "all",
    semester: int = None,
    academic_year: str = None,
) -> Dict[str, Any]:
    """
    Module-level convenience function for indexing a single document.

    Args:
        file_path: Absolute path to file
        doc_type: Document type (policy, notice, handbook, etc.)
        department: Department code or "all"
        semester: Relevant semester or None
        academic_year: e.g. "2024-25"

    Returns:
        Ingestion stats dict
    """
    indexer = DocumentIndexer()
    source_file = Path(file_path).name

    return indexer.index_document(
        file_path=file_path,
        source_file=source_file,
        doc_type=doc_type,
        department=department,
        semester=semester,
        academic_year=academic_year,
    )
