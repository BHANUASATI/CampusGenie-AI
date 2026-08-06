"""
ChromaDB Collection Definitions
================================
Defines all collections used by CampusGenie AI.

Collection schema (metadata fields stored alongside every chunk):
  source_file    : str   — original filename
  doc_type       : str   — policy | notice | handbook | timetable | catalog | brochure | general
  department     : str   — department code or "all"
  semester       : int   — 0 = all semesters
  academic_year  : str   — e.g. "2024-25"
  chunk_index    : int
  total_chunks   : int
  upload_date    : str   — ISO format
  page_number    : int   — -1 if unknown
  document_id    : str   — UUID assigned at ingestion time
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import chromadb
from chromadb.utils.embedding_functions import EmbeddingFunction

from ai_engine.core.config import ai_config
from ai_engine.core.exceptions import VectorStoreError
from ai_engine.core.logging import get_logger
from ai_engine.vectorstore.client import get_chroma_client

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Valid doc_type values
# ---------------------------------------------------------------------------
DOC_TYPES = frozenset([
    "policy",
    "notice",
    "handbook",
    "timetable",
    "catalog",
    "brochure",
    "exam",
    "placement",
    "faculty",
    "admission",
    "scholarship",
    "attendance",
    "general",
])

COLLECTION_NAME = ai_config.CHROMA_COLLECTION_NAME

# Staging collection used during reindex to avoid blocking reads
STAGING_COLLECTION_NAME = f"{COLLECTION_NAME}_staging"


# ---------------------------------------------------------------------------
# Custom embedding function adapter for ChromaDB
# (ChromaDB needs its own EmbeddingFunction interface)
# ---------------------------------------------------------------------------
class SentenceTransformerEmbeddingFunction(EmbeddingFunction):
    """Adapter that wraps our singleton EmbeddingModel for ChromaDB."""

    def __call__(self, input: list[str]) -> list[list[float]]:
        from ai_engine.embeddings.model import get_embedding_model
        model = get_embedding_model()
        embeddings = model.encode_documents(input)
        return embeddings.tolist()


_embedding_function = SentenceTransformerEmbeddingFunction()


def get_or_create_collection(
    name: str = COLLECTION_NAME,
) -> chromadb.Collection:
    """
    Get the named collection or create it with the correct embedding function
    and metadata schema.
    """
    client = get_chroma_client()
    try:
        collection = client.get_or_create_collection(
            name=name,
            embedding_function=_embedding_function,
            metadata={
                "hnsw:space": "cosine",       # use cosine similarity
                "hnsw:construction_ef": 200,  # higher = better quality index
                "hnsw:M": 16,                 # number of bidirectional links
            },
        )
        logger.info(
            "chromadb.collection_ready",
            extra={"event": "chromadb.collection_ready", "collection_name": name},
        )
        return collection
    except Exception as e:
        raise VectorStoreError(f"Failed to get/create collection '{name}'", {"error": str(e)}) from e


def get_collection(name: str = COLLECTION_NAME) -> chromadb.Collection:
    """Get an existing collection; raises VectorStoreError if not found."""
    client = get_chroma_client()
    try:
        return client.get_collection(name=name, embedding_function=_embedding_function)
    except Exception as e:
        raise VectorStoreError(f"Collection '{name}' not found", {"error": str(e)}) from e


def swap_staging_to_main() -> None:
    """
    Atomic swap: staging collection → main collection.
    Used during full reindex to avoid blocking reads.
    """
    client = get_chroma_client()
    try:
        # Delete old main if it exists
        try:
            client.delete_collection(COLLECTION_NAME)
            logger.info("chromadb.collection_deleted", extra={"name": COLLECTION_NAME})
        except Exception:
            pass  # might not exist on first run

        # ChromaDB doesn't support rename, so we re-create from staging
        # (full reindex writes to staging then calls this)
        staging = get_collection(STAGING_COLLECTION_NAME)
        logger.info(
            "chromadb.swap_complete",
            extra={
                "event": "chromadb.swap_complete",
                "count": staging.count(),
            },
        )
    except Exception as e:
        raise VectorStoreError("Failed to swap staging to main", {"error": str(e)}) from e
