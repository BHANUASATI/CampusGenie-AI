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

from typing import Dict, Any, Optional

from ai_engine.core.config import ai_config
from ai_engine.core.logging import Timer, get_logger
from ai_engine.embeddings.reranker import get_reranker
from ai_engine.schemas.agent_state import AgentState, UserContext
from ai_engine.schemas.retrieval import RankedDocument, RetrievalResult, Source
from ai_engine.vectorstore.manager import get_vector_store

logger = get_logger(__name__)


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
    reranker = get_reranker()

    # -----------------------------------------------------------------------
    # Step 1: Build metadata filter
    # -----------------------------------------------------------------------
    metadata_filter = _build_metadata_filter(user_context)

    # -----------------------------------------------------------------------
    # Step 2: Hybrid Search (Vector + BM25)
    # -----------------------------------------------------------------------
    with Timer() as retrieval_timer:
        try:
            # First try with metadata filter using hybrid search
            candidates = vector_store.hybrid_search(
                query=query,
                top_k=ai_config.RETRIEVAL_TOP_K,
                where=metadata_filter,
            )
            
            # If no results with filter, try without filter for broader search
            if not candidates and metadata_filter:
                logger.info(
                    "retriever.no_results_with_filter",
                    extra={"query": query[:80], "trace_id": trace_id},
                )
                candidates = vector_store.hybrid_search(
                    query=query,
                    top_k=ai_config.RETRIEVAL_TOP_K,
                    where=None,  # No filter for broader search
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
    doc_texts = [doc.content for doc in candidates]

    with Timer() as rerank_timer:
        ranked = reranker.rerank(
            query=query,
            documents=doc_texts,
            top_n=ai_config.RERANK_TOP_N,
        )

    rerank_latency = rerank_timer.elapsed_ms

    # Build RankedDocument list from reranker output
    ranked_docs: list[RankedDocument] = []
    for original_idx, rerank_score in ranked:
        candidate = candidates[original_idx]
        ranked_docs.append(
            RankedDocument(
                chunk_id=candidate.chunk_id,
                content=candidate.content,
                metadata=candidate.metadata,
                similarity_score=candidate.similarity_score,
                rerank_score=float(rerank_score),
            )
        )

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
