"""
Custom exceptions for the AI Engine.
====================================
All AI subsystem errors should inherit from AIEngineError.
"""


class AIEngineError(Exception):
    """Base exception for all AI engine errors."""

    def __init__(self, message: str = "AI engine error occurred", details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class EmbeddingModelError(AIEngineError):
    """Raised when embedding model loading or inference fails."""


class VectorStoreError(AIEngineError):
    """Raised when ChromaDB operations fail."""


class DocumentProcessingError(AIEngineError):
    """Raised when document extraction, chunking, or ingestion fails."""


class LLMError(AIEngineError):
    """Raised when Gemini API calls fail."""


class ToolExecutionError(AIEngineError):
    """Raised when a tool call fails (DB query errors, etc.)."""


class MemoryError(AIEngineError):
    """Raised when conversation memory operations fail."""


class PromptInjectionDetected(AIEngineError):
    """Raised when prompt injection patterns are detected."""


class RateLimitExceeded(AIEngineError):
    """Raised when per-user rate limits are exceeded."""


class InvalidIntentError(AIEngineError):
    """Raised when intent classification returns invalid result."""


class RetrievalError(AIEngineError):
    """Raised when document retrieval fails."""


class AnswerGenerationError(AIEngineError):
    """Raised when answer generation fails."""
