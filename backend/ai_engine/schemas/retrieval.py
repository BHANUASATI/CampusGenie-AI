"""
Retrieval Schemas
=================
Pydantic models for documents retrieved from ChromaDB and reranked results.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DocumentMetadata(BaseModel):
    """Metadata stored alongside every ChromaDB chunk."""

    source_file: str = Field(..., description="Original filename e.g. Attendance_Policy_2024.pdf")
    doc_type: str = Field(..., description="Category e.g. policy, notice, handbook, timetable")
    department: Optional[str] = Field(None, description="Target department, or 'all'")
    semester: Optional[int] = Field(None, description="Relevant semester, or None for all")
    academic_year: Optional[str] = Field(None, description="e.g. 2024-25")
    chunk_index: int = Field(0, description="Position of this chunk within the source document")
    total_chunks: int = Field(1, description="Total number of chunks from this document")
    upload_date: Optional[str] = Field(None)
    page_number: Optional[int] = Field(None)


class RetrievedDocument(BaseModel):
    """A single document chunk returned from ChromaDB before reranking."""

    chunk_id: str = Field(..., description="ChromaDB document ID")
    content: str = Field(..., description="Raw text of the chunk")
    metadata: DocumentMetadata
    similarity_score: float = Field(..., ge=0.0, le=1.0, description="Cosine similarity to query")


class RankedDocument(BaseModel):
    """A document chunk after cross-encoder reranking."""

    chunk_id: str
    content: str
    metadata: DocumentMetadata
    similarity_score: float = Field(..., description="Original cosine similarity")
    rerank_score: float = Field(..., description="Cross-encoder relevance score")


class Source(BaseModel):
    """A cited source included in the final response."""

    filename: str
    doc_type: str
    relevance: float = Field(..., ge=0.0, le=1.0)
    excerpt: Optional[str] = Field(None, description="Short snippet shown to user")


class RetrievalResult(BaseModel):
    """Complete output of the Retriever Agent node."""

    query_used: str
    documents: List[RankedDocument] = Field(default_factory=list)
    total_retrieved: int = Field(0, description="Raw count before reranking")
    total_after_rerank: int = Field(0, description="Count passed to answer generator")
    retrieval_latency_ms: float = Field(0.0)
    rerank_latency_ms: float = Field(0.0)
