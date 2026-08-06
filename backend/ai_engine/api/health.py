"""
AI Engine Health Check
=======================
Returns readiness status — used by load balancers and monitoring tools.
Returns 503 until all models are loaded.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ai_engine.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/health")
async def ai_health_check():
    """Check if the AI engine is ready to serve requests."""
    health = {"status": "ok", "components": {}}

    # Check embedding model
    try:
        from ai_engine.embeddings.model import get_embedding_model
        model = get_embedding_model()
        health["components"]["embedding_model"] = {
            "status": "ok",
            "model": model.model.get_sentence_embedding_dimension(),
        }
    except Exception as e:
        health["components"]["embedding_model"] = {"status": "error", "error": str(e)}
        health["status"] = "degraded"

    # Check ChromaDB
    try:
        from ai_engine.vectorstore.manager import get_vector_store
        vs = get_vector_store()
        count = vs.count()
        health["components"]["chromadb"] = {"status": "ok", "chunks": count}
    except Exception as e:
        health["components"]["chromadb"] = {"status": "error", "error": str(e)}
        health["status"] = "degraded"

    # Check Gemini API key presence
    from ai_engine.core.config import ai_config
    if ai_config.GEMINI_API_KEY:
        health["components"]["gemini"] = {"status": "configured"}
    else:
        health["components"]["gemini"] = {"status": "missing_api_key"}
        health["status"] = "degraded"

    if health["status"] == "degraded":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=health,
        )

    return health
