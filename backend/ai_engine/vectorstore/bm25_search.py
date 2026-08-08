"""
BM25 Search & Hybrid Rank Fusion
================================
Provides exact keyword search (BM25) and combines vector similarity
with BM25 keyword matching using Reciprocal Rank Fusion (RRF).

Why BM25 + Hybrid Search?
  - Vector embeddings can miss exact numeric rules (e.g. "75%", "Rule 4.2"),
    specific course codes ("MCA-101"), or exact policy terms ("antiragging").
  - BM25 captures precise term matches.
  - Reciprocal Rank Fusion (RRF) merges candidate lists robustly without
    needing score normalization across different score distributions.
"""

from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Tuple


def _tokenize(text: str) -> List[str]:
    """Tokenize text into lowercase alphanumeric words."""
    return re.findall(r"\w+", text.lower())


class BM25Searcher:
    """
    Lightweight, in-memory BM25Okapi search implementation.
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.doc_len: List[int] = []
        self.avg_doc_len: float = 0.0
        self.doc_count: int = 0
        self.corpus_tokens: List[List[str]] = []
        self.idf: Dict[str, float] = {}

    def fit(self, corpus: List[str]) -> None:
        """Build BM25 stats over a list of document strings."""
        self.doc_count = len(corpus)
        if self.doc_count == 0:
            return

        self.corpus_tokens = [_tokenize(doc) for doc in corpus]
        self.doc_len = [len(tokens) for tokens in self.corpus_tokens]
        self.avg_doc_len = sum(self.doc_len) / self.doc_count if self.doc_count > 0 else 0.0

        # Calculate document frequency (DF) per term
        df: Dict[str, int] = {}
        for tokens in self.corpus_tokens:
            for term in set(tokens):
                df[term] = df.get(term, 0) + 1

        # Calculate inverse document frequency (IDF) with BM25 formula
        for term, freq in df.items():
            # BM25 IDF variant
            self.idf[term] = math.log((self.doc_count - freq + 0.5) / (freq + 0.5) + 1.0)

    def search(self, query: str, top_k: int = 10) -> List[Tuple[int, float]]:
        """
        Search corpus with query.

        Returns:
            List of (original_idx, bm25_score) tuples sorted by score descending.
        """
        if self.doc_count == 0:
            return []

        query_tokens = _tokenize(query)
        scores: List[float] = [0.0] * self.doc_count

        for q_term in query_tokens:
            if q_term not in self.idf:
                continue

            q_idf = self.idf[q_term]
            for doc_idx, tokens in enumerate(self.corpus_tokens):
                term_freq = tokens.count(q_term)
                if term_freq == 0:
                    continue

                denom = term_freq + self.k1 * (1.0 - self.b + self.b * (self.doc_len[doc_idx] / (self.avg_doc_len or 1.0)))
                score = q_idf * (term_freq * (self.k1 + 1.0)) / denom
                scores[doc_idx] += score

        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        return [item for item in ranked if item[1] > 0.0][:top_k]


def reciprocal_rank_fusion(
    vector_rankings: List[Tuple[Any, float]],
    bm25_rankings: List[Tuple[Any, float]],
    rrf_k: int = 60,
    top_n: int = 10,
) -> List[Tuple[Any, float]]:
    """
    Combine two ranked lists using Reciprocal Rank Fusion (RRF).

    RRF score = sum(1.0 / (rrf_k + rank_i)) for each document list.

    Args:
        vector_rankings: List of (doc_object, vector_score)
        bm25_rankings: List of (doc_object, bm25_score)
        rrf_k: Smoothing constant (default 60)
        top_n: Number of fused results to return

    Returns:
        List of (doc_object, rrf_score) sorted by rrf_score descending.
    """
    rrf_scores: Dict[Any, float] = {}
    doc_map: Dict[Any, Any] = {}

    # Rank positions (1-indexed)
    for rank, (doc, _) in enumerate(vector_rankings, start=1):
        doc_key = getattr(doc, "chunk_id", id(doc))
        doc_map[doc_key] = doc
        rrf_scores[doc_key] = rrf_scores.get(doc_key, 0.0) + (1.0 / (rrf_k + rank))

    for rank, (doc, _) in enumerate(bm25_rankings, start=1):
        doc_key = getattr(doc, "chunk_id", id(doc))
        doc_map[doc_key] = doc
        rrf_scores[doc_key] = rrf_scores.get(doc_key, 0.0) + (1.0 / (rrf_k + rank))

    sorted_fused = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [(doc_map[key], score) for key, score in sorted_fused[:top_n]]
