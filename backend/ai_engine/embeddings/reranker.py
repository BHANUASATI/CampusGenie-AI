"""
Cross-Encoder Reranker
=======================
Uses a cross-encoder model to rerank the top-K candidates from ChromaDB.

Why rerank?
  Bi-encoder embeddings (like all-MiniLM-L6-v2) encode query and document
  independently then compare via cosine similarity. This is fast but misses
  fine-grained interactions between query and document terms.

  A cross-encoder reads BOTH query + document together, producing a single
  relevance score that is significantly more accurate. The tradeoff is speed:
  we only rerank the top-10 candidates (not the entire corpus).

Model: cross-encoder/ms-marco-MiniLM-L-6-v2
  - Trained on the MS MARCO passage ranking dataset
  - ~22MB
  - ~100-200ms for 10 candidates on CPU
  - Outputs raw logit scores (higher = more relevant)
"""

from __future__ import annotations

import threading
from typing import List, Tuple

from sentence_transformers import CrossEncoder

from ai_engine.core.config import ai_config
from ai_engine.core.exceptions import EmbeddingModelError
from ai_engine.core.logging import get_logger

logger = get_logger(__name__)


class CrossEncoderReranker:
    """Thread-safe singleton cross-encoder for candidate reranking."""

    _instance: CrossEncoderReranker | None = None
    _lock = threading.Lock()

    def __init__(self):
        if CrossEncoderReranker._instance is not None:
            raise RuntimeError("Use CrossEncoderReranker.get_instance()")

        logger.info(
            "reranker.loading",
            extra={
                "event": "reranker.loading",
                "model_name": ai_config.RERANKER_MODEL_NAME,
            },
        )

        try:
            self.model = CrossEncoder(
                ai_config.RERANKER_MODEL_NAME,
                device=ai_config.EMBEDDING_DEVICE,
            )
            logger.info(
                "reranker.loaded",
                extra={"event": "reranker.loaded", "model_name": ai_config.RERANKER_MODEL_NAME},
            )
        except Exception as e:
            logger.error("reranker.load_failed", extra={"error": str(e)})
            raise EmbeddingModelError(
                f"Failed to load reranker: {ai_config.RERANKER_MODEL_NAME}", {"error": str(e)}
            ) from e

    @classmethod
    def get_instance(cls) -> CrossEncoderReranker:
        """Return singleton, create if needed."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def rerank(
        self,
        query: str,
        documents: List[str],
        top_n: int = None,
    ) -> List[Tuple[int, float]]:
        """
        Rerank documents against a query.

        Args:
            query: The user's query
            documents: List of document text strings
            top_n: Return only the top-N results (default from config)

        Returns:
            List of (original_index, rerank_score) sorted by score descending.
        """
        if not documents:
            return []

        if top_n is None:
            top_n = ai_config.RERANK_TOP_N

        try:
            # Build (query, doc) pairs for cross-encoder
            pairs = [(query, doc) for doc in documents]
            scores: List[float] = self.model.predict(pairs).tolist()

            # Pair with original indices and sort descending
            indexed_scores = sorted(
                enumerate(scores), key=lambda x: x[1], reverse=True
            )

            return indexed_scores[:top_n]

        except Exception as e:
            logger.error("reranker.rerank_failed", extra={"error": str(e)})
            # Graceful degradation: return first top_n without reranking
            logger.warning("reranker.fallback", extra={"reason": "Returning un-reranked results"})
            return [(i, 0.0) for i in range(min(top_n, len(documents)))]


def get_reranker() -> CrossEncoderReranker:
    """Return the singleton reranker instance."""
    return CrossEncoderReranker.get_instance()
