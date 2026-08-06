"""
Response Schemas
================
The structured output that every chat interaction produces.
The API layer maps these onto the existing AIMessageResponse shape
so the frontend requires zero changes.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from ai_engine.schemas.retrieval import Source


class AgentResponse(BaseModel):
    """
    Rich structured response produced by the Answer Generation Agent.
    The `answer` field becomes the ai_message.content the frontend renders.
    All other fields are additive metadata.
    """

    answer: str = Field(..., description="The main answer text (markdown supported)")
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Answer confidence score 0–1"
    )
    sources: List[Source] = Field(
        default_factory=list, description="Cited source documents"
    )
    follow_up_questions: List[str] = Field(
        default_factory=list,
        description="3 suggested follow-up questions relevant to the answer",
    )
    intent_detected: Optional[str] = Field(
        None, description="The classified intent for debugging/analytics"
    )
    retrieval_used: bool = Field(False, description="Whether ChromaDB retrieval was performed")
    tool_used: Optional[str] = Field(None, description="Name of the tool called, if any")
    tool_result: Optional[Dict[str, Any]] = Field(
        None, description="Structured result from the tool call"
    )
    execution_trace: List[str] = Field(
        default_factory=list, description="LangGraph nodes executed in order"
    )
    total_latency_ms: float = Field(0.0, description="End-to-end latency")


class ToolResult(BaseModel):
    """Structured result from a single tool call."""

    tool_name: str
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    latency_ms: float = 0.0
