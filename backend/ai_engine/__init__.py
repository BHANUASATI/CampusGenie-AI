"""
CampusGenie AI Engine
=====================
Production-grade Agentic AI subsystem built on LangGraph + LangChain + Gemini 2.5 Flash.

Architecture:
  FastAPI Gateway → Security Layer → LangGraph Orchestrator
    ├── Memory Agent (load/save conversation history)
    ├── Intent Classification Agent (Gemini Flash, structured output)
    ├── Retriever Agent (ChromaDB + cross-encoder reranker)
    ├── Tool Calling Agent (live SQLAlchemy DB queries)
    └── Answer Generation Agent (RAG prompt → Gemini 2.5 Flash)
"""

__version__ = "1.0.0"
