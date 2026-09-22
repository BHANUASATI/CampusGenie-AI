"""
Retriever Agent
================
LangGraph node that searches ChromaDB and reranks results.

Pipeline:
  1. Build metadata filter from user context (department, semester)
  2. Semantic search ChromaDB (top-K candidates)
  3. Cross-encoder reranking (top-N final results)
  4. Return RankedDocument list + RetrievalResult stats
"""

from __future__ import annotations

import re
from typing import Dict, Any, List, Optional

from ai_engine.core.config import ai_config
from ai_engine.core.logging import Timer, get_logger
from ai_engine.embeddings.reranker import get_reranker
from ai_engine.schemas.agent_state import AgentState, UserContext
from ai_engine.schemas.retrieval import RankedDocument, RetrievedDocument, RetrievalResult, Source
from ai_engine.vectorstore.manager import get_vector_store

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Hybrid ranking
# ---------------------------------------------------------------------------
# A purely cross-encoder-based ranking can drop strong semantic matches for
# tabular / list-like content (e.g. a "SEMESTER I" course table) because the
# reranker was trained on MS-MARCO web passages.  We therefore blend three
# signals, all scaled to [0, 1]:
#   - similarity rank (from ChromaDB cosine order)
#   - reranker rank
#   - lexical query-token overlap (helps term-specific / tabular queries)
# Ranks are turned into "1 - rank/N" so the best item in a signal scores 1.0.
_QUERY_STOPWORDS = frozenset({
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how",
    "i", "in", "is", "it", "me", "my", "of", "on", "or", "the", "to",
    "what", "when", "where", "which", "with", "you", "your", "show", "tell",
    "me", "do", "does", "can", "would", "please", "about",
})


def _query_tokens(query: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", query.lower())) - _QUERY_STOPWORDS


def _content_tokens(content: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", content.lower()))


def _overlap_fraction(query: str, content: str) -> float:
    query_toks = _query_tokens(query)
    if not query_toks:
        return 0.0
    matches = query_toks & _content_tokens(content)
    return len(matches) / len(query_toks)


def _hybrid_score(
    sim_rank: int,
    rerank_rank: Optional[int],
    total: int,
    query: str,
    content: str,
    *,
    w_sim: float = 0.5,
    w_rer: float = 0.3,
    w_lex: float = 0.2,
    lex_overlap: Optional[float] = None,
) -> float:
    """Blended relevance score in [0, 1].  Ranks are 0-based; larger = better."""
    if total <= 0:
        return 0.0
    sim_component = w_sim * (1.0 - sim_rank / total)
    if rerank_rank is not None:
        rer_component = w_rer * (1.0 - min(rerank_rank, total - 1) / total)
    else:
        rer_component = 0.0
    if lex_overlap is None:
        lex_overlap = _overlap_fraction(query, content)
    lex_component = w_lex * lex_overlap
    return sim_component + rer_component + lex_component


# ---------------------------------------------------------------------------
# Multi-query retrieval
# ---------------------------------------------------------------------------
# ChromaDB semantic search can miss tabular / list-like chunks (course tables)
# and the intent classifier sometimes rewrites the query in a way that harms
# retrieval.  We therefore search with several queries and merge the results:
#   - the (possibly refined) retrieval query
#   - the student's raw message
#   - query-specific enrichment (e.g. "SEMESTER I Course Code ..." for
#     syllabus questions) so course tables surface.

_RETRIEVAL_CURRICULUM_KEYWORDS = (
    "syllabus", "syllabi", "curriculum", "scheme of study", "scheme",
    "course list", "subjects", "sem", "semester",
)

_SEMESTER_LABELS = ("I", "II", "III", "IV", "V", "VI", "VII", "VIII")


def _curriculum_enrichment_queries(user_message: str, retrieval_query: str) -> List[str]:
    """Extra search queries that surface course-table chunks, which plain
    semantic search tends to under-rank for e.g. syllabus questions."""
    joined = f"{user_message} {retrieval_query}".lower()
    if not any(k in joined for k in _RETRIEVAL_CURRICULUM_KEYWORDS):
        return []

    sem: Optional[int] = None
    # "1 sem", "sem 1", "semester 1", "1st sem" ...
    m = re.search(r"\b([1-8])\s*(?:st|nd|rd|th)?\s*sem(?:ester)?\b", joined)
    if not m:
        m = re.search(r"\bsem(?:ester)?\s*([1-8])\b", joined)
    if m:
        sem = int(m.group(1))

    label = _SEMESTER_LABELS[sem - 1] if sem else ""
    queries: List[str] = ["SEMESTER Course Code Course Title Category Credits"]
    if label:
        queries.append(f"SEMESTER {label} Course Code Course Title Category Credits")
        queries.append(f"SEMESTER {label} SN Course Code Course Title")
        if "mca" in joined:
            queries.append(f"MCA syllabus scheme of study SEMESTER {label} courses")
        elif "bca" in joined:
            queries.append(f"BCA syllabus scheme of study SEMESTER {label} courses")
    # Always add a generic "scheme of study" probe for syllabus-type questions
    queries.append("Scheme of Study and Syllabi courses list")
    return queries


def _multi_query_search(
    vector_store,
    queries: List[str],
    top_k: int,
    where: Optional[Dict[str, Any]],
) -> List[RetrievedDocument]:
    """Run several ChromaDB searches and merge results (dedupe by chunk_id)."""
    merged: Dict[str, RetrievedDocument] = {}
    for query in queries:
        query = (query or "").strip()
        if not query:
            continue
        try:
            results = vector_store.search(query=query, top_k=top_k, where=where)
        except Exception as e:  # noqa: BLE001 — one bad sub-query must not sink retrieval
            logger.warning(
                "retriever.search_subquery_failed",
                extra={"error": str(e), "query": query[:60]},
            )
            continue
        for doc in results:
            current = merged.get(doc.chunk_id)
            if current is None or doc.similarity_score > current.similarity_score:
                merged[doc.chunk_id] = doc

    # Sort by similarity so the list index doubles as the similarity rank.
    return sorted(merged.values(), key=lambda d: d.similarity_score, reverse=True)


def _build_metadata_filter(user_context: UserContext) -> Optional[Dict[str, Any]]:
    """
    Build a ChromaDB `where` filter based on the student's context.
    
    Filters documents to:
      - Universal docs (department == "all")  OR  student's department
      - Universal docs (semester == 0)        OR  student's semester
    
    Returns None if no filters can be applied (no dept/semester info).
    """
    conditions = []

    dept = user_context.get("department")
    if dept:
        conditions.append({"$or": [{"department": "all"}, {"department": dept}]})

    semester = user_context.get("semester")
    if semester:
        conditions.append({"$or": [{"semester": 0}, {"semester": semester}]})

    if not conditions:
        return None

    if len(conditions) == 1:
        return conditions[0]

    return {"$and": conditions}


def retrieve_context_node(state: AgentState) -> AgentState:
    """
    LangGraph node: Retrieve and rerank relevant documents from ChromaDB.

    Only runs when state.needs_retrieval is True.

    Args:
        state: Current agent state

    Returns:
        Updated state with retrieval_result and retrieved_documents populated
    """
    query = state.get("retrieval_query") or state["user_message"]
    user_context = state["user_context"]
    trace_id = state.get("trace_id", "")

    logger.info(
        "retriever.start",
        extra={
            "event": "retriever.start",
            "query": query[:100],
            "trace_id": trace_id,
        },
    )

    vector_store = get_vector_store()
    fast_mode = ai_config.FAST_RESPONSE_MODE
    reranker = None if fast_mode else get_reranker()
    candidate_limit = (
        ai_config.FAST_RETRIEVAL_TOP_K if fast_mode else ai_config.RETRIEVAL_TOP_K
    )

    # -----------------------------------------------------------------------
    # Step 1: Build metadata filter
    # -----------------------------------------------------------------------
    metadata_filter = _build_metadata_filter(user_context)

    # -----------------------------------------------------------------------
    # Step 2: Semantic search (multi-query)
    # -----------------------------------------------------------------------
    user_message = state.get("user_message") or ""
    search_queries: List[str] = []
    for q in (query, user_message, *_curriculum_enrichment_queries(user_message, query)):
        q = (q or "").strip()
        if q and q not in search_queries:
            search_queries.append(q)

    with Timer() as retrieval_timer:
        try:
            # First try with metadata filter
            candidates = _multi_query_search(
                vector_store, search_queries, candidate_limit, metadata_filter
            )

            # If no results with filter, try without filter for broader search
            if not candidates and metadata_filter:
                logger.info(
                    "retriever.no_results_with_filter",
                    extra={"query": query[:80], "trace_id": trace_id},
                )
                candidates = _multi_query_search(
                    vector_store, search_queries, candidate_limit, None
                )
        except Exception as e:
            logger.error("retriever.search.failed", extra={"error": str(e)})
            candidates = []

    retrieval_latency = retrieval_timer.elapsed_ms
    total_retrieved = len(candidates)

    logger.info(
        "retriever.search.done",
        extra={
            "event": "retriever.search.done",
            "query": query[:80],
            "candidates": total_retrieved,
            "latency_ms": retrieval_latency,
            "trace_id": trace_id,
        },
    )

    if not candidates:
        empty_result = RetrievalResult(
            query_used=query,
            documents=[],
            total_retrieved=0,
            total_after_rerank=0,
            retrieval_latency_ms=retrieval_latency,
            rerank_latency_ms=0.0,
        )
        return {
            **state,
            "retrieval_result": empty_result,
            "retrieved_documents": [],
            "execution_trace": state.get("execution_trace", []) + ["retrieve_context(empty)"],
        }

    # -----------------------------------------------------------------------
    # Step 3: Rerank
    # -----------------------------------------------------------------------
    if fast_mode:
        # ChromaDB already returns similarity-ranked results.  Skipping the
        # cross-encoder avoids the largest local CPU cost on the fast path.
        rerank_latency = 0.0
        rerank_order: Optional[Dict[int, int]] = None
    else:
        doc_texts = [doc.content for doc in candidates]
        with Timer() as rerank_timer:
            # Ask for scores of ALL candidates so the hybrid ranking below can
            # use the full rerank ordering instead of a truncated top-N.
            ranked = reranker.rerank(
                query=query,
                documents=doc_texts,
                top_n=len(candidates),
            )
        rerank_latency = rerank_timer.elapsed_ms
        # Map candidate index -> its position in the rerank ordering (0 = best)
        rerank_order = {
            original_idx: position
            for position, (original_idx, _score) in enumerate(ranked)
        }

    # -----------------------------------------------------------------------
    # Step 4: Hybrid ordering (similarity + rerank + lexical overlap)
    # -----------------------------------------------------------------------
    # Relying only on the reranker can drop good semantic matches (tables,
    # short lists); relying only on similarity misses the reranker's benefits.
    # Blend both, then expand with sibling chunks of the strongest anchors.
    total = len(candidates)
    final_top_n = (
        ai_config.FAST_RETRIEVAL_TOP_K if fast_mode else ai_config.RERANK_TOP_N
    )

    def _lex_overlap_for(content: str) -> float:
        # Best lexical overlap across every query we searched with — lets a
        # course-table chunk win via the enriched "SEMESTER I Course Code..."
        # query even when the primary query shares almost no literal tokens.
        return max(
            (_overlap_fraction(q, content) for q in search_queries),
            default=0.0,
        )

    def _hybrid_for(idx: int) -> float:
        if fast_mode:
            return _hybrid_score(
                sim_rank=idx,
                rerank_rank=None,
                total=total,
                query=query,
                content=candidates[idx].content,
                w_sim=0.7,
                w_rer=0.0,
                w_lex=0.3,
                lex_overlap=_lex_overlap_for(candidates[idx].content),
            )
        return _hybrid_score(
            sim_rank=idx,
            rerank_rank=rerank_order.get(idx, total),   # type: ignore[union-attr]
            total=total,
            query=query,
            content=candidates[idx].content,
            lex_overlap=_lex_overlap_for(candidates[idx].content),
        )

    score_by_idx = {idx: _hybrid_for(idx) for idx in range(total)}
    ordered = sorted(range(total), key=lambda idx: score_by_idx[idx], reverse=True)

    # Expand the context with sibling chunks: a PDF often splits one logical
    # section across consecutive chunks (e.g. a "Scheme of Study and Syllabi"
    # heading followed by the SEMESTER I course table).  Neighbours of the
    # top anchors are added right below their anchor in the final ranking.
    n_anchors = 2 if fast_mode else 6

    def _add(candidate: RetrievedDocument, score: float) -> None:
        if candidate.chunk_id in score_by_chunk and score <= score_by_chunk[candidate.chunk_id]:
            return
        score_by_chunk[candidate.chunk_id] = score
        payload[candidate.chunk_id] = RankedDocument(
            chunk_id=candidate.chunk_id,
            content=candidate.content,
            metadata=candidate.metadata,
            similarity_score=candidate.similarity_score,
            rerank_score=score,  # clamped to [0,1] on use
        )

    score_by_chunk: Dict[str, float] = {}
    payload: Dict[str, RankedDocument] = {}

    for idx in ordered:
        _add(candidates[idx], score_by_idx[idx])

    if not fast_mode:
        for idx in ordered[:n_anchors]:
            anchor = candidates[idx]
            anchor_score = score_by_idx[idx]
            for sibling in vector_store.get_sibling_chunks(anchor.chunk_id, radius=2):
                # Siblings rank just below their anchor chunk
                _add(sibling, anchor_score - 0.05)

    final_order = sorted(payload, key=lambda cid: score_by_chunk[cid], reverse=True)[:final_top_n]
    ranked_docs = [payload[cid] for cid in final_order]

    result = RetrievalResult(
        query_used=query,
        documents=ranked_docs,
        total_retrieved=total_retrieved,
        total_after_rerank=len(ranked_docs),
        retrieval_latency_ms=retrieval_latency,
        rerank_latency_ms=rerank_latency,
    )

    logger.info(
        "retriever.done",
        extra={
            "event": "retriever.done",
            "total_retrieved": total_retrieved,
            "after_rerank": len(ranked_docs),
            "rerank_latency_ms": rerank_latency,
            "sources": [d.metadata.source_file for d in ranked_docs],
            "trace_id": trace_id,
        },
    )

    return {
        **state,
        "retrieval_result": result,
        "retrieved_documents": ranked_docs,
        "execution_trace": state.get("execution_trace", []) + ["retrieve_context"],
    }
