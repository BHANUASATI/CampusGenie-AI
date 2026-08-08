#!/usr/bin/env python3
"""
Integration test script for the RAG pipeline:
  - VectorStore hybrid search (BM25 + Vector Search)
  - Cross-Encoder reranking
  - RAG prompt construction with few-shot examples
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from ai_engine.vectorstore.manager import get_vector_store
from ai_engine.embeddings.reranker import get_reranker
from ai_engine.prompts.rag_prompt import build_rag_prompt
from ai_engine.schemas.retrieval import RankedDocument

def main():
    print("==================================================")
    print(" 🧪 Testing RAG Pipeline (Hybrid Search + Reranking)")
    print("==================================================")

    vector_store = get_vector_store()
    reranker = get_reranker()

    test_queries = [
        "What is the minimum attendance requirement?",
        "What are the examination and fee charges?",
        "What are the hostel in-out timings?",
    ]

    for i, query in enumerate(test_queries, 1):
        print(f"\n--------------------------------------------------")
        print(f" Test {i}: Query = '{query}'")
        print(f"--------------------------------------------------")

        # Step 1: Hybrid search (BM25 + Vector)
        hybrid_docs = vector_store.hybrid_search(query=query, top_k=5)
        print(f" Found {len(hybrid_docs)} candidate chunks via Hybrid Search:")
        for idx, doc in enumerate(hybrid_docs, 1):
            print(f"   [{idx}] Source: {doc.metadata.source_file} | Score: {doc.similarity_score:.4f}")

        # Step 2: Cross-Encoder Reranking
        doc_texts = [d.content for d in hybrid_docs]
        reranked_tuples = reranker.rerank(query=query, documents=doc_texts, top_n=3)

        ranked_docs = []
        print(f"\n Top {len(reranked_tuples)} Reranked Results (Cross-Encoder):")
        for rank, (orig_idx, rerank_score) in enumerate(reranked_tuples, 1):
            doc = hybrid_docs[orig_idx]
            ranked_doc = RankedDocument(
                chunk_id=doc.chunk_id,
                content=doc.content,
                metadata=doc.metadata,
                similarity_score=doc.similarity_score,
                rerank_score=float(rerank_score),
            )
            ranked_docs.append(ranked_doc)
            print(f"   [{rank}] {doc.metadata.source_file} (Rerank Score: {rerank_score:.4f})")
            print(f"       Snippet: {doc.content[:120].strip()}...")

        # Step 3: Test Prompt Generation
        prompt = build_rag_prompt(
            user_question=query,
            documents=ranked_docs,
            tool_result=None,
            conversation_history=[],
        )
        print(f"\n Generated RAG Prompt length: {len(prompt)} characters")
        assert "FEW-SHOT EXAMPLES" in prompt
        print("  ✓ Few-Shot examples successfully present in prompt!")

    print("\n==================================================")
    print(" ✅ ALL RAG PIPELINE TESTS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    main()
