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

    def reindex_all_documents(
        self,
        document_dir: str = "backend/knowledge",
        department: str = "all",
        semester: Optional[int] = None,
        academic_year: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Batch index all documents in a directory into the vector store.

        Args:
            document_dir: Path to directory containing knowledge documents
            department: Default department filter
            semester: Default semester filter
            academic_year: Default academic year filter

        Returns:
            Dict containing batch indexing statistics
        """
        dir_path = Path(document_dir).resolve()
        if not dir_path.exists() or not dir_path.is_dir():
            raise DocumentProcessingError(
                f"Knowledge directory does not exist or is not a directory: {document_dir}"
            )

        supported_extensions = {".pdf", ".docx", ".txt", ".csv", ".md"}
        files_to_process = [
            f for f in dir_path.iterdir()
            if f.is_file() and f.suffix.lower() in supported_extensions
        ]

        if not files_to_process:
            logger.warning(
                "indexer.no_files_found",
                extra={"dir": str(dir_path)}
            )
            return {
                "total_files": 0,
                "indexed_files": 0,
                "total_chunks": 0,
                "errors": [],
            }

        logger.info(
            "indexer.batch_start",
            extra={"dir": str(dir_path), "file_count": len(files_to_process)}
        )

        results = []
        errors = []
        total_chunks = 0

        for file_path in sorted(files_to_process):
            source_file = file_path.name
            fname_lower = source_file.lower()

            # Infer document type from filename
            if "attendance" in fname_lower:
                doc_type = "policy"
            elif "lab" in fname_lower or "rules" in fname_lower or "conduct" in fname_lower:
                doc_type = "rules"
            elif "exam" in fname_lower or "fee" in fname_lower or "grading" in fname_lower:
                doc_type = "examination"
            elif "calendar" in fname_lower:
                doc_type = "calendar"
            elif "placement" in fname_lower:
                doc_type = "policy"
            elif "handbook" in fname_lower:
                doc_type = "handbook"
            else:
                doc_type = "knowledge"

            try:
                # First delete existing vectors for this source file to prevent duplicate chunks
                self.vector_store.delete_by_source_file(source_file)

                stats = self.index_document(
                    file_path=str(file_path),
                    source_file=source_file,
                    doc_type=doc_type,
                    department=department,
                    semester=semester,
                    academic_year=academic_year,
                )
                results.append(stats)
                total_chunks += stats.get("chunks_indexed", 0)
                logger.info(
                    "indexer.file_success",
                    extra={"file": source_file, "chunks": stats.get("chunks_indexed", 0)}
                )
            except Exception as e:
                err_msg = f"Failed to index {source_file}: {e}"
                logger.error("indexer.file_error", extra={"file": source_file, "error": str(e)})
                errors.append({"file": source_file, "error": str(e)})

        summary = {
            "total_files": len(files_to_process),
            "indexed_files": len(results),
            "total_chunks": total_chunks,
            "errors": errors,
            "details": results,
        }
        return summary


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


def index_knowledge_directory(knowledge_dir: str = "backend/knowledge") -> Dict[str, Any]:
    """
    Module-level convenience function for batch indexing a directory.
    """
    indexer = DocumentIndexer()
    return indexer.reindex_all_documents(document_dir=knowledge_dir)


if __name__ == "__main__":
    import sys
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "backend/knowledge"
    print(f"🚀 Indexing all documents from: {target_dir}")
    try:
        summary = index_knowledge_directory(target_dir)
        print(f"\n✅ Indexing Complete!")
        print(f"  • Total files found: {summary['total_files']}")
        print(f"  • Successfully indexed: {summary['indexed_files']}")
        print(f"  • Total chunks created: {summary['total_chunks']}")
        if summary['errors']:
            print(f"  • Errors encountered: {len(summary['errors'])}")
            for err in summary['errors']:
                print(f"    - {err['file']}: {err['error']}")
    except Exception as exc:
        print(f"❌ Error during indexing: {exc}")
        sys.exit(1)

