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
    GEMINI_TEMPERATURE: float = Field(default=0.1, ge=0.0, le=2.0)
    GEMINI_MAX_OUTPUT_TOKENS: int = Field(default=500)
    GEMINI_CHAT_MODEL: str = Field(
        default="gemini-flash-lite-latest",
        description="Model for answer generation",
    )
    GEMINI_FAST_MODEL: str = Field(
        default="gemini-flash-lite-latest",
        description="Model for intent classification (low latency)",
    )
    GEMINI_FALLBACK_MODELS: list[str] = Field(
        default_factory=lambda: [
            # gemini-2.5-flash spends much of max_output_tokens on thinking and
            # can finish with MAX_TOKENS after only a few visible words. This
            # lite model returns complete answers in ~2s on the same prompt.
            "gemini-3.5-flash-lite",
            "gemini-flash-lite-latest",
        ],
        description="Models to try when primary is rate-limited or stalls",
    )
    GEMINI_RATE_LIMIT_RETRIES: int = Field(default=0, ge=0, le=5)
    GEMINI_TIMEOUT_SECONDS: float = Field(default=8.0)
    # If the primary model has not answered within this many seconds, start the
    # fallback models in parallel and take whichever answer arrives first. This
    # removes the long tail when one Gemini endpoint stalls.
    GEMINI_HEDGE_DELAY_SECONDS: float = Field(default=2.0, ge=0.5, le=10.0)

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
    RETRIEVAL_TOP_K: int = Field(default=8, description="Candidates fetched from ChromaDB")
    RERANK_TOP_N: int = Field(default=6, description="Documents passed to LLM after reranking")
    FAST_RESPONSE_MODE: bool = Field(default=False)
    # Live DB tool results are formatted locally (fast and exact), but document
    # answers must go through the LLM. The old default built an answer by
    # picking one regex-scored sentence from a chunk, which produced wrong or
    # half-finished answers ("Name: Advanced Database", raw JSON, first date
    # found in a calendar, etc.). Enable this only as a temporary LLM-outage
    # fallback, not as the normal answering path.
    PREFER_LOCAL_GROUNDED_ANSWERS: bool = Field(default=False)
    FAST_INTENT_ROUTING: bool = Field(default=True)
    FAST_RETRIEVAL_TOP_K: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Maximum document chunks considered in fast response mode",
    )
    MAX_CONTEXT_CHARS_PER_DOCUMENT: int = Field(
        default=600,
        ge=200,
        le=10000,
        description="Maximum characters included from one chunk in an LLM prompt",
    )
    SIMILARITY_THRESHOLD: float = Field(
        default=0.1,
        description="Minimum cosine similarity to include a document",
    )
    MIN_GROUNDED_SIMILARITY: float = Field(
        default=0.25,
        description=(
            "If even the best retrieved chunk is below this cosine similarity, "
            "answer from the knowledge base is not supported — return the "
            "out-of-scope response instead of letting the LLM use general knowledge."
        ),
    )
    CHUNK_SIZE: int = Field(default=768, description="Token chunk size for text splitting")
    CHUNK_OVERLAP: int = Field(default=100, description="Token overlap between consecutive chunks")
    TABLE_ROWS_PER_CHUNK: int = Field(
        default=3,
        ge=1,
        le=100,
        description="Rows per chunk when splitting docx tables into row-groups",
    )

    # -----------------------------------------------------------------------
    # Memory
    # -----------------------------------------------------------------------
    MEMORY_WINDOW_SIZE: int = Field(
        default=6, description="Number of recent conversation turns to load"
    )

    # -----------------------------------------------------------------------
    # Rate limiting
    # -----------------------------------------------------------------------
    RATE_LIMIT_PER_MINUTE: int = Field(default=60)
    RATE_LIMIT_PER_DAY: int = Field(default=1000)
    RATE_LIMIT_BURST: int = Field(default=20)

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

    # OCR for scanned / image-only PDF pages. Native text is always preferred;
    # only pages with less than OCR_MIN_TEXT_CHARS characters are rendered and
    # passed through Tesseract (installed in the Dockerfile).
    OCR_ENABLED: bool = Field(default=True)
    OCR_MIN_TEXT_CHARS: int = Field(default=60, ge=0, le=500)
    OCR_DPI: int = Field(default=200, ge=100, le=400)
    OCR_LANGUAGE: str = Field(default="eng")
    # Tesseract page segmentation.  PSM 4 keeps table rows on one line
    # ("21 | Diwali 20 October,25"), unlike automatic PSM 3 which often puts
    # the date on the line above the event name.
    OCR_PSM: int = Field(default=4, ge=3, le=13)

    # Rebuild the vector index from the document files on every boot.  Railway
    # can mount an empty volume over the image's baked-in ChromaDB, which is
    # why previously uploaded documents disappeared after a redeploy.
    REBUILD_INDEX_ON_STARTUP: bool = Field(default=True)

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
    LLM_REQUEST_TIMEOUT_SECONDS: float = Field(
        default=12.0,
        ge=1.0,
        le=120.0,
        description="Hard timeout for one remote LLM request",
    )
    LLM_ANSWER_TIMEOUT_SECONDS: float = Field(
        default=12.0,
        ge=1.0,
        le=60.0,
        description=(
            "Maximum time the answer generator waits for one remote LLM answer "
            "before falling back. A 3s cap used to expire before Gemini could "
            "answer a RAG prompt (2-5s healthy, longer cold), so nearly every "
            "reply silently used the low-quality local extraction path."
        ),
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
