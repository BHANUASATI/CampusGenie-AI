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

from functools import lru_cache
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
    def _documents_from_query_result(
        self,
        result: Dict[str, Any],
        similarity_threshold: float,
    ) -> List[RetrievedDocument]:
        """Convert one ChromaDB query result into RetrievedDocument objects.

        The collection is configured with ``hnsw:space=cosine``, so ChromaDB
        returns cosine *distance* in [0, 2]. The old ``1 - distance² / 2``
        conversion was wrong (it reported 0.995 for a distance of 0.1 and
        badly compressed the score range used for confidence).
        """
        retrieved: List[RetrievedDocument] = []
        if not result or not result.get("ids") or not result["ids"][0]:
            return retrieved

        ids = result["ids"][0]
        documents = result.get("documents") or [[]]
        metadatas = result.get("metadatas") or [[]]
        distances = result.get("distances") or [[]]

        for i, chunk_id in enumerate(ids):
            try:
                distance = float(distances[0][i])
            except (IndexError, TypeError, ValueError):
                continue
            similarity = max(0.0, 1.0 - distance)
            if similarity < similarity_threshold:
                continue
            retrieved.append(
                RetrievedDocument(
                    chunk_id=chunk_id,
                    content=documents[0][i],
                    metadata=DocumentMetadata(**metadatas[0][i]),
                    similarity_score=similarity,
                )
            )
        return retrieved

    def _brute_force_search(
        self,
        query: str,
        top_k: int,
        where: Optional[Dict[str, Any]],
        similarity_threshold: float,
    ) -> List[RetrievedDocument]:
        """Exact cosine search over stored vectors when HNSW query fails.

        Some Chroma/HNSW versions raise ``Cannot return the results in a
        contigious 2D array`` for filtered or batched queries. The collection is
        small (hundreds of chunks), so fetching the stored embeddings and doing
        the dot product locally is both fast and more reliable.
        """
        import numpy as np

        from ai_engine.embeddings.model import get_embedding_model

        data = self.collection.get(
            where=where,
            include=["embeddings", "documents", "metadatas"],
        )
        ids = data.get("ids") or []
        embeddings = data.get("embeddings")
        if not ids or embeddings is None or len(embeddings) == 0:
            return []

        query_vector = get_embedding_model().encode_query(query)
        query_norm = float(np.linalg.norm(query_vector)) or 1.0
        matrix = np.asarray(embeddings, dtype=np.float32)
        norms = np.linalg.norm(matrix, axis=1)
        norms[norms == 0] = 1.0
        similarities = (matrix @ query_vector.astype(np.float32)) / (norms * query_norm)

        order = np.argsort(-similarities)[:top_k]
        documents = data.get("documents") or ["" for _ in ids]
        metadatas = data.get("metadatas") or [{} for _ in ids]

        retrieved: List[RetrievedDocument] = []
        for idx in order:
            score = float(similarities[idx])
            if score < similarity_threshold:
                continue
            retrieved.append(
                RetrievedDocument(
                    chunk_id=ids[idx],
                    content=documents[idx],
                    metadata=DocumentMetadata(**metadatas[idx]),
                    similarity_score=score,
                )
            )
        return retrieved

    def search_many(
        self,
        queries: List[str],
        top_k: int = None,
        where: Dict[str, Any] = None,
        similarity_threshold: float = None,
    ) -> List[List[RetrievedDocument]]:
        """Embed and search several queries in ONE ChromaDB round trip.

        The retriever used to call ``search`` once per enrichment query, which
        meant embedding each query separately and opening a new Chroma query
        each time. Batching cuts warm retrieval latency substantially.
        """
        if not queries:
            return []
        if top_k is None:
            top_k = ai_config.RETRIEVAL_TOP_K
        if similarity_threshold is None:
            similarity_threshold = ai_config.SIMILARITY_THRESHOLD

        try:
            results = self.collection.query(
                query_texts=queries,
                n_results=top_k,
                where=where,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:  # noqa: BLE001 — HNSW has a fragile batched path
            logger.warning(
                "vectorstore.batch_query_failed_searching_individually",
                extra={"error": str(e), "queries": len(queries)},
            )
            return [
                self.search(
                    query=q,
                    top_k=top_k,
                    where=where,
                    similarity_threshold=similarity_threshold,
                )
                for q in queries
            ]

        per_query = results.get("ids") or []
        return [
            self._documents_from_query_result(
                {
                    "ids": [per_query[i]],
                    "documents": [(results.get("documents") or [[]])[i]],
                    "metadatas": [(results.get("metadatas") or [[]])[i]],
                    "distances": [(results.get("distances") or [[]])[i]],
                },
                similarity_threshold,
            )
            for i in range(len(per_query))
        ]

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
            return self._documents_from_query_result(results, similarity_threshold)

        except Exception as e:
            logger.warning(
                "vectorstore.query_failed_using_exact_search",
                extra={"error": str(e), "query": query},
            )
            try:
                return self._brute_force_search(
                    query=query,
                    top_k=top_k,
                    where=where,
                    similarity_threshold=similarity_threshold,
                )
            except Exception as exact_error:  # noqa: BLE001
                logger.error(
                    "vectorstore.search_failed",
                    extra={"error": str(exact_error), "query": query},
                )
                raise VectorStoreError(
                    "Failed to search vector store", {"error": str(exact_error)}
                ) from exact_error

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

    def get_sibling_chunks(self, chunk_id: str, radius: int = 2) -> List[RetrievedDocument]:
        """
        Return the neighbouring chunks of ``chunk_id`` from the same source
        document (adjacent ``chunk_index`` values).

        PDF/scanned documents often break a logical section across chunks —
        e.g. a "Scheme of Study and Syllabi" heading in one chunk and the
        SEMESTER I course table in the next.  Pulling the siblings of strong
        matches gives the LLM the complete section instead of a fragment.

        Args:
            chunk_id: ChromaDB chunk id, format ``<document_id>::<index>``
            radius: How many chunks to fetch on each side (default 2)

        Returns:
            List of RetrievedDocument (similarity_score set to 0.0 — these
            are context extensions, not query matches).
        """
        try:
            doc_id, _, index_str = chunk_id.rpartition("::")
            if not doc_id or not index_str.isdigit():
                return []
            center = int(index_str)
            indexes = sorted({max(0, center + d) for d in range(-radius, radius + 1) if d != 0})
            if not indexes:
                return []

            results = self.collection.get(
                where={"$and": [{"document_id": doc_id}, {"chunk_index": {"$in": indexes}}]},
                include=["documents", "metadatas"],
            )
            siblings: List[RetrievedDocument] = []
            if results and results["ids"]:
                for i in range(len(results["ids"])):
                    siblings.append(
                        RetrievedDocument(
                            chunk_id=results["ids"][i],
                            content=results["documents"][i],
                            metadata=DocumentMetadata(**results["metadatas"][i]),
                            similarity_score=0.0,
                        )
                    )
            return siblings
        except Exception as e:
            logger.warning(
                "vectorstore.sibling_fetch_failed",
                extra={"error": str(e), "chunk_id": chunk_id},
            )
            return []

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
@lru_cache(maxsize=1)
def get_vector_store() -> VectorStoreManager:
    """Return the process-wide default collection manager.

    Reusing it avoids an unnecessary ``get_or_create_collection`` call for
    every chat request while retaining Chroma's persistent-client singleton.
    """
    return VectorStoreManager()
