"""
Vector Store Manager
====================
High-level API for all ChromaDB operations:
  - upsert (add/update documents)
  - search (semantic, MMR, filtered)
  - delete (by document_id or chunk_id)
  - count
  - list all docs
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

import chromadb

from ai_engine.core.config import ai_config
from ai_engine.core.exceptions import VectorStoreError
from ai_engine.core.logging import get_logger
from ai_engine.schemas.retrieval import DocumentMetadata, RetrievedDocument
from ai_engine.vectorstore.collections import get_or_create_collection

logger = get_logger(__name__)


class VectorStoreManager:
    """Manages all ChromaDB CRUD operations."""

    def __init__(self, collection_name: str = None):
        # Fall back to configured default when no name provided
        self.collection = get_or_create_collection(
            collection_name if collection_name is not None else ai_config.CHROMA_COLLECTION_NAME
        )

    # -----------------------------------------------------------------------
    # Upsert
    # -----------------------------------------------------------------------
    def upsert_chunks(
        self,
        chunks: List[str],
        metadatas: List[Dict[str, Any]],
        document_id: str = None,
    ) -> int:
        """
        Add or update document chunks.

        Args:
            chunks: List of text chunks
            metadatas: Metadata dict for each chunk (must match DocumentMetadata fields)
            document_id: Unique document ID (generates UUID if None)

        Returns:
            Number of chunks upserted
        """
        if not chunks:
            return 0

        if len(chunks) != len(metadatas):
            raise ValueError("chunks and metadatas must have the same length")

        doc_id = document_id or str(uuid4())

        # Generate unique IDs for each chunk
        chunk_ids = [f"{doc_id}::{i}" for i in range(len(chunks))]

        try:
            self.collection.upsert(
                ids=chunk_ids,
                documents=chunks,
                metadatas=metadatas,
            )
            logger.info(
                "vectorstore.upsert",
                extra={
                    "event": "vectorstore.upsert",
                    "document_id": doc_id,
                    "num_chunks": len(chunks),
                },
            )
            return len(chunks)
        except Exception as e:
            logger.error("vectorstore.upsert_failed", extra={"error": str(e), "document_id": doc_id})
            raise VectorStoreError("Failed to upsert chunks", {"error": str(e)}) from e

    # -----------------------------------------------------------------------
    # Search
    # -----------------------------------------------------------------------
    def search(
        self,
        query: str,
        top_k: int = None,
        where: Dict[str, Any] = None,
        similarity_threshold: float = None,
    ) -> List[RetrievedDocument]:
        """
        Semantic search with optional metadata filtering.

        Args:
            query: Search query string
            top_k: Number of results to return (default from config)
            where: Metadata filter dict (ChromaDB syntax)
            similarity_threshold: Minimum cosine similarity (default from config)

        Returns:
            List of RetrievedDocument objects sorted by similarity desc
        """
        if top_k is None:
            top_k = ai_config.RETRIEVAL_TOP_K
        if similarity_threshold is None:
            similarity_threshold = ai_config.SIMILARITY_THRESHOLD

        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=top_k,
                where=where,
                include=["documents", "metadatas", "distances"],
            )

            if not results or not results["ids"]:
                return []

            # Convert to RetrievedDocument objects
            retrieved = []
            for i in range(len(results["ids"][0])):
                chunk_id = results["ids"][0][i]
                content = results["documents"][0][i]
                metadata = results["metadatas"][0][i]
                distance = results["distances"][0][i]

                # ChromaDB returns L2 distance; convert to cosine similarity
                # similarity = 1 - (distance^2 / 2)  for normalized vectors
                similarity = max(0.0, 1.0 - (distance ** 2) / 2.0)

                if similarity < similarity_threshold:
                    continue

                retrieved.append(
                    RetrievedDocument(
                        chunk_id=chunk_id,
                        content=content,
                        metadata=DocumentMetadata(**metadata),
                        similarity_score=similarity,
                    )
                )

            return retrieved

        except Exception as e:
            logger.error("vectorstore.search_failed", extra={"error": str(e), "query": query})
            raise VectorStoreError("Failed to search vector store", {"error": str(e)}) from e

    def search_mmr(
        self,
        query: str,
        top_k: int = None,
        lambda_mult: float = 0.5,
        where: Dict[str, Any] = None,
    ) -> List[RetrievedDocument]:
        """
        Maximal Marginal Relevance search — returns diverse results.

        Args:
            query: Search query
            top_k: Number of results
            lambda_mult: 0.0 = max diversity, 1.0 = max relevance
            where: Metadata filters

        Returns:
            List of RetrievedDocument (diverse set)
        """
        if top_k is None:
            top_k = ai_config.RETRIEVAL_TOP_K

        try:
            # ChromaDB doesn't have built-in MMR, so we fetch 3x top_k then manually diversify
            # For production: use a library or implement MMR algorithm
            # For now: fall back to standard search
            logger.warning("vectorstore.mmr_fallback", extra={"reason": "MMR not implemented, using standard search"})
            return self.search(query, top_k=top_k * 2, where=where)[:top_k]

        except Exception as e:
            logger.error("vectorstore.mmr_failed", extra={"error": str(e)})
            return self.search(query, top_k=top_k, where=where)

    # -----------------------------------------------------------------------
    # Delete
    # -----------------------------------------------------------------------
    def delete_by_document_id(self, document_id: str) -> int:
        """Delete all chunks belonging to a document. Returns count deleted."""
        try:
            # Query for all chunk IDs with this document_id prefix
            results = self.collection.get(where={"document_id": document_id})
            if results and results["ids"]:
                self.collection.delete(ids=results["ids"])
                count = len(results["ids"])
                logger.info(
                    "vectorstore.deleted",
                    extra={"event": "vectorstore.deleted", "document_id": document_id, "count": count},
                )
                return count
            return 0
        except Exception as e:
            logger.error("vectorstore.delete_failed", extra={"error": str(e), "document_id": document_id})
            raise VectorStoreError("Failed to delete document", {"error": str(e)}) from e

    def delete_by_source_file(self, source_file: str) -> int:
        """Delete all chunks from a source file."""
        try:
            results = self.collection.get(where={"source_file": source_file})
            if results and results["ids"]:
                self.collection.delete(ids=results["ids"])
                count = len(results["ids"])
                logger.info(
                    "vectorstore.deleted_file",
                    extra={"source_file": source_file, "count": count},
                )
                return count
            return 0
        except Exception as e:
            raise VectorStoreError("Failed to delete source file", {"error": str(e)}) from e

    # -----------------------------------------------------------------------
    # Metadata
    # -----------------------------------------------------------------------
    def count(self) -> int:
        """Return total number of chunks in the collection."""
        try:
            return self.collection.count()
        except Exception as e:
            raise VectorStoreError("Failed to count documents", {"error": str(e)}) from e

    def list_sources(self) -> List[Dict[str, Any]]:
        """Return all unique source files with their metadata."""
        try:
            # Fetch all documents (this can be slow for large collections)
            all_data = self.collection.get(include=["metadatas"])
            if not all_data or not all_data["metadatas"]:
                return []

            # Group by source_file, counting chunks as we go
            sources_map: Dict[str, Dict[str, Any]] = {}
            for meta in all_data["metadatas"]:
                sf = meta.get("source_file", "unknown")
                if sf not in sources_map:
                    sources_map[sf] = {
                        "source_file": sf,
                        "doc_type": meta.get("doc_type", "unknown"),
                        "department": meta.get("department"),
                        "upload_date": meta.get("upload_date"),
                        "total_chunks": 0,
                    }
                # Increment the real chunk count for this source file
                sources_map[sf]["total_chunks"] += 1

            return list(sources_map.values())

        except Exception as e:
            raise VectorStoreError("Failed to list sources", {"error": str(e)}) from e


# ---------------------------------------------------------------------------
# Module-level convenience function
# ---------------------------------------------------------------------------
def get_vector_store() -> VectorStoreManager:
    """Return a VectorStoreManager for the default collection."""
    return VectorStoreManager()
