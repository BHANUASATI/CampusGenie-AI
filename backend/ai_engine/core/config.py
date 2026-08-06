"""
AI Engine Configuration
=======================
All AI-specific settings with sensible production defaults.
Reads from the same .env file as the main application.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# ---------------------------------------------------------------------------
# Resolve paths relative to the backend/ directory regardless of CWD
# ---------------------------------------------------------------------------
_BACKEND_DIR = Path(__file__).resolve().parents[2]   # backend/
_CHROMA_DIR  = _BACKEND_DIR / "chroma_db"
_UPLOADS_DIR = _BACKEND_DIR / "uploads" / "ai_documents"


class AIEngineConfig(BaseSettings):
    """
    AI Engine settings.  All keys can be overridden via environment variables
    or the root .env file.  Keys are prefixed with AI_ to avoid collisions.
    """

    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),
        env_prefix="",          # no prefix — reads GEMINI_API_KEY directly
        extra="ignore",
        case_sensitive=False,
    )

    # -----------------------------------------------------------------------
    # Gemini
    # -----------------------------------------------------------------------
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API key")
    GEMINI_CHAT_MODEL: str = Field(
        default="gemini-2.5-flash",
        description="Model for answer generation (high quality, streaming)",
    )
    GEMINI_FAST_MODEL: str = Field(
        default="gemini-2.5-flash",
        description="Model for intent classification (low latency)",
    )
    GEMINI_TEMPERATURE: float = Field(default=0.1, ge=0.0, le=2.0)
    GEMINI_MAX_OUTPUT_TOKENS: int = Field(default=2048)

    # -----------------------------------------------------------------------
    # Embedding model (sentence-transformers, runs locally, no API cost)
    # -----------------------------------------------------------------------
    EMBEDDING_MODEL_NAME: str = Field(
        default="all-MiniLM-L6-v2",
        description="SentenceTransformer model for document + query embeddings",
    )
    RERANKER_MODEL_NAME: str = Field(
        default="cross-encoder/ms-marco-MiniLM-L-6-v2",
        description="Cross-encoder model for top-K reranking",
    )
    EMBEDDING_BATCH_SIZE: int = Field(default=32)
    EMBEDDING_DEVICE: str = Field(default="cpu", description="cpu | cuda | mps")

    # -----------------------------------------------------------------------
    # ChromaDB
    # -----------------------------------------------------------------------
    CHROMA_PERSIST_DIR: str = Field(
        default=str(_CHROMA_DIR),
        description="Persistent storage directory for ChromaDB",
    )
    CHROMA_COLLECTION_NAME: str = Field(
        default="campus_genie_docs",
        description="Primary collection name",
    )

    # -----------------------------------------------------------------------
    # RAG / Retrieval
    # -----------------------------------------------------------------------
    RETRIEVAL_TOP_K: int = Field(default=10, description="Candidates fetched from ChromaDB")
    RERANK_TOP_N: int = Field(default=3, description="Documents passed to LLM after reranking")
    SIMILARITY_THRESHOLD: float = Field(
        default=0.3,
        description="Minimum cosine similarity to include a document",
    )
    CHUNK_SIZE: int = Field(default=512, description="Token chunk size for text splitting")
    CHUNK_OVERLAP: int = Field(default=50, description="Token overlap between consecutive chunks")

    # -----------------------------------------------------------------------
    # Memory
    # -----------------------------------------------------------------------
    MEMORY_WINDOW_SIZE: int = Field(
        default=6, description="Number of recent conversation turns to load"
    )

    # -----------------------------------------------------------------------
    # Rate limiting
    # -----------------------------------------------------------------------
    RATE_LIMIT_PER_MINUTE: int = Field(default=20)
    RATE_LIMIT_PER_DAY: int = Field(default=200)
    RATE_LIMIT_BURST: int = Field(default=5)

    # -----------------------------------------------------------------------
    # Document uploads
    # -----------------------------------------------------------------------
    AI_DOCUMENTS_DIR: str = Field(
        default=str(_UPLOADS_DIR),
        description="Directory where admin-uploaded AI knowledge docs are stored",
    )
    MAX_DOCUMENT_SIZE_MB: int = Field(default=50)
    ALLOWED_DOCUMENT_EXTENSIONS: List[str] = Field(
        default=[".pdf", ".docx", ".txt", ".csv", ".md"]
    )

    # -----------------------------------------------------------------------
    # Observability
    # -----------------------------------------------------------------------
    LANGSMITH_API_KEY: Optional[str] = Field(default=None)
    LANGSMITH_ENDPOINT: str = Field(default="https://api.smith.langchain.com")
    LANGSMITH_PROJECT: str = Field(default="CampusGenie")
    ENABLE_LANGSMITH_TRACING: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO")
    ENABLE_COST_TRACKING: bool = Field(default=True)

    # -----------------------------------------------------------------------
    # OpenRouter fallback (used when Gemini is unavailable / quota exceeded)
    # -----------------------------------------------------------------------
    OPENROUTER_API_KEY: str = Field(default="", description="OpenRouter API key")
    LLM_PROVIDER: str = Field(
        default="gemini",
        description="Primary LLM provider: 'gemini' | 'openrouter'",
    )
    LLM_MODEL: str = Field(
        default="nvidia/nemotron-3-ultra-550b-a55b:free",
        description="OpenRouter model string used as fallback",
    )
    LLM_BASE_URL: str = Field(
        default="https://openrouter.ai/api/v1",
        description="OpenRouter (OpenAI-compatible) base URL",
    )
    LLM_TEMPERATURE: float = Field(
        default=0.3,
        ge=0.0,
        le=2.0,
        description="Temperature used for the OpenRouter fallback model",
    )

    # -----------------------------------------------------------------------
    # Safety
    # -----------------------------------------------------------------------
    ENABLE_PROMPT_INJECTION_SCAN: bool = Field(default=True)
    ENABLE_PII_MASKING: bool = Field(default=True)


# Singleton — import this everywhere, never instantiate AIEngineConfig directly
ai_config = AIEngineConfig()

# Ensure storage directories exist
Path(ai_config.CHROMA_PERSIST_DIR).mkdir(parents=True, exist_ok=True)
Path(ai_config.AI_DOCUMENTS_DIR).mkdir(parents=True, exist_ok=True)
