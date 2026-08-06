"""
ChromaDB Client Singleton
==========================
Manages the persistent ChromaDB client.  One client per process.

Why persistent client?
  chromadb.PersistentClient writes embeddings to disk on every upsert.
  Using a singleton avoids repeated file-lock acquisition and connection
  overhead on every request.
"""

from __future__ import annotations

import threading

import chromadb
from chromadb.config import Settings as ChromaSettings

from ai_engine.core.config import ai_config
from ai_engine.core.exceptions import VectorStoreError
from ai_engine.core.logging import get_logger

logger = get_logger(__name__)


class ChromaClientSingleton:
    """Thread-safe singleton ChromaDB persistent client."""

    _instance: chromadb.PersistentClient | None = None
    _lock = threading.Lock()

    @classmethod
    def get_client(cls) -> chromadb.PersistentClient:
        """Return the shared ChromaDB client, creating it on first call."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls._create_client()
        return cls._instance

    @classmethod
    def _create_client(cls) -> chromadb.PersistentClient:
        logger.info(
            "chromadb.connecting",
            extra={
                "event": "chromadb.connecting",
                "persist_dir": ai_config.CHROMA_PERSIST_DIR,
            },
        )
        try:
            client = chromadb.PersistentClient(
                path=ai_config.CHROMA_PERSIST_DIR,
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                ),
            )
            logger.info(
                "chromadb.connected",
                extra={"event": "chromadb.connected", "persist_dir": ai_config.CHROMA_PERSIST_DIR},
            )
            return client
        except Exception as e:
            logger.error("chromadb.connection_failed", extra={"error": str(e)})
            raise VectorStoreError("Failed to connect to ChromaDB", {"error": str(e)}) from e


def get_chroma_client() -> chromadb.PersistentClient:
    """Module-level helper — import this in all consumers."""
    return ChromaClientSingleton.get_client()
