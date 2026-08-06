"""
Document Service
=================
Handles document upload and indexing.

Background processing: large PDFs can take 30-60 seconds to process.
Use FastAPI BackgroundTasks to avoid blocking the response.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Any, Dict, Optional

from ai_engine.core.config import ai_config
from ai_engine.core.exceptions import DocumentProcessingError
from ai_engine.core.logging import get_logger
from ai_engine.document_pipeline.indexer import index_document_from_path
from ai_engine.vectorstore.collections import DOC_TYPES
from ai_engine.vectorstore.manager import get_vector_store

logger = get_logger(__name__)


class DocumentService:
    """Service for document upload and management."""

    def upload_and_index(
        self,
        file_path: str,
        original_filename: str,
        doc_type: str,
        department: str = "all",
        semester: Optional[int] = None,
        academic_year: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Upload a document and index it in ChromaDB.

        This is a synchronous blocking call. For production, call this
        inside BackgroundTasks.

        Args:
            file_path: Temporary uploaded file path
            original_filename: Original filename from user
            doc_type: Document category (must be in DOC_TYPES)
            department: Department code or "all"
            semester: Relevant semester or None
            academic_year: e.g. "2024-25"

        Returns:
            Ingestion stats dict

        Raises:
            DocumentProcessingError: if doc_type invalid or indexing fails
        """
        # Validate doc_type
        if doc_type not in DOC_TYPES:
            raise DocumentProcessingError(
                f"Invalid doc_type: {doc_type}",
                {"allowed": list(DOC_TYPES), "provided": doc_type},
            )

        # Validate file extension
        ext = Path(original_filename).suffix.lower()
        if ext not in ai_config.ALLOWED_DOCUMENT_EXTENSIONS:
            raise DocumentProcessingError(
                f"Unsupported file type: {ext}",
                {"allowed": ai_config.ALLOWED_DOCUMENT_EXTENSIONS},
            )

        # Move file to permanent location
        permanent_dir = Path(ai_config.AI_DOCUMENTS_DIR)
        permanent_dir.mkdir(parents=True, exist_ok=True)
        permanent_path = permanent_dir / original_filename

        # Handle duplicate filenames
        counter = 1
        while permanent_path.exists():
            stem = Path(original_filename).stem
            permanent_path = permanent_dir / f"{stem}_{counter}{ext}"
            counter += 1

        shutil.copy(file_path, permanent_path)

        logger.info(
            "document.uploaded",
            extra={
                "file": original_filename,
                "doc_type": doc_type,
                "size_mb": os.path.getsize(permanent_path) / (1024 * 1024),
            },
        )

        # Index the document
        try:
            stats = index_document_from_path(
                file_path=str(permanent_path),
                doc_type=doc_type,
                department=department,
                semester=semester,
                academic_year=academic_year,
            )
            return stats
        except Exception as e:
            # Clean up file on failure
            if permanent_path.exists():
                permanent_path.unlink()
            raise DocumentProcessingError(
                f"Failed to index document: {original_filename}",
                {"error": str(e)},
            ) from e

    def list_documents(self) -> list:
        """List all indexed documents with metadata."""
        vector_store = get_vector_store()
        return vector_store.list_sources()

    def delete_document(self, source_file: str) -> int:
        """Delete a document from the vector store by filename."""
        vector_store = get_vector_store()
        count = vector_store.delete_by_source_file(source_file)
        logger.info(
            "document.deleted",
            extra={"source_file": source_file, "chunks_deleted": count},
        )
        return count

    def get_stats(self) -> Dict[str, Any]:
        """Return vector store statistics."""
        vector_store = get_vector_store()
        return {
            "total_chunks": vector_store.count(),
            "unique_documents": len(vector_store.list_sources()),
        }
