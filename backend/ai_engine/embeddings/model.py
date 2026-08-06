"""
Embedding Model (SentenceTransformer)
======================================
Singleton wrapper around sentence-transformers.

Why singleton?
  Loading the model takes ~2-3 seconds. We load it ONCE at FastAPI startup
  and reuse it across all requests.

Model: all-MiniLM-L6-v2
  - 384 dimensions
  - 80MB download
  - ~5ms inference per sentence on CPU
  - Trained on 1B+ sentence pairs
  - Top performer for semantic similarity tasks
"""

from __future__ import annotations

import threading
from typing import List, Union

import numpy as np
from sentence_transformers import SentenceTransformer

from ai_engine.core.config import ai_config
from ai_engine.core.exceptions import EmbeddingModelError
from ai_engine.core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingModel:
    """
    Thread-safe singleton for the embedding model.
    Call get_instance() to retrieve the loaded model.
    """

    _instance: EmbeddingModel | None = None
    _lock = threading.Lock()

    def __init__(self):
        if EmbeddingModel._instance is not None:
            raise RuntimeError("Use EmbeddingModel.get_instance() instead of direct instantiation")

        logger.info(
            "embedding.loading",
            extra={
                "event": "embedding.loading",
                "model_name": ai_config.EMBEDDING_MODEL_NAME,
                "device": ai_config.EMBEDDING_DEVICE,
            },
        )

        try:
            self.model = SentenceTransformer(
                ai_config.EMBEDDING_MODEL_NAME,
                device=ai_config.EMBEDDING_DEVICE,
            )
            self.dimension = self.model.get_embedding_dimension()

            logger.info(
                "embedding.loaded",
                extra={
                    "event": "embedding.loaded",
                    "model_name": ai_config.EMBEDDING_MODEL_NAME,
                    "dimension": self.dimension,
                },
            )
        except Exception as e:
            logger.error("embedding.load_failed", extra={"error": str(e)})
            raise EmbeddingModelError(
                f"Failed to load embedding model: {ai_config.EMBEDDING_MODEL_NAME}",
                {"error": str(e)},
            ) from e

    @classmethod
    def get_instance(cls) -> EmbeddingModel:
        """Return the singleton instance, creating it if necessary (thread-safe)."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def encode(
        self,
        texts: Union[str, List[str]],
        batch_size: int = None,
        show_progress_bar: bool = False,
        convert_to_numpy: bool = True,
    ) -> np.ndarray:
        """
        Encode text(s) into embeddings.

        Args:
            texts: Single string or list of strings
            batch_size: Batch size for encoding (default from config)
            show_progress_bar: Show tqdm progress bar for large batches
            convert_to_numpy: Return numpy array (vs torch tensor)

        Returns:
            np.ndarray of shape (len(texts), dimension)
        """
        if batch_size is None:
            batch_size = ai_config.EMBEDDING_BATCH_SIZE

        try:
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                show_progress_bar=show_progress_bar,
                convert_to_numpy=convert_to_numpy,
            )
            return embeddings
        except Exception as e:
            logger.error(
                "embedding.encode_failed",
                extra={"error": str(e), "num_texts": 1 if isinstance(texts, str) else len(texts)},
            )
            raise EmbeddingModelError("Failed to encode texts", {"error": str(e)}) from e

    def encode_query(self, query: str) -> np.ndarray:
        """Convenience method for encoding a single query (returns 1D array)."""
        return self.encode(query, show_progress_bar=False)[0]

    def encode_documents(self, documents: List[str], show_progress: bool = False) -> np.ndarray:
        """Convenience method for encoding a batch of documents."""
        return self.encode(documents, show_progress_bar=show_progress)


# ---------------------------------------------------------------------------
# Module-level convenience function
# ---------------------------------------------------------------------------
def get_embedding_model() -> EmbeddingModel:
    """Return the singleton embedding model instance."""
    return EmbeddingModel.get_instance()
