"""
CampusGenie Backend — Main Application Entry Point
===================================================
FastAPI application with all routers registered.

AI Engine is mounted at /api/ai — the enterprise LangGraph agentic system.
All other routes are unchanged from the original application.
"""

from __future__ import annotations

import sys
import os

# ---------------------------------------------------------------------------
# Ensure backend/ is importable so ai_engine package can be found
# ---------------------------------------------------------------------------
_BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..")
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

import models, schemas, auth
from database import get_db, engine
from config import settings
from dependencies import get_current_user
from registrar_routes import router as registrar_router
from auth_routes import router as auth_router
from student_routes import router as student_router
from faculty_routes_new import router as faculty_router
from faculty_simple_routes import router as faculty_simple_router
from admin_routes import router as admin_router
from task_routes import router as task_router
from document_routes import router as document_router
from calendar_routes import router as calendar_router
from school_routes import router as school_router
from oauth_routes import router as oauth_router

# ---------------------------------------------------------------------------
# AI Engine routers  (replaces old ai_assistant_routes import)
# ---------------------------------------------------------------------------
from ai_engine.api.ai_routes import router as ai_assistant_router
from ai_engine.api.document_routes import router as ai_document_router
from ai_engine.api.health import router as ai_health_router

# Create all database tables
models.Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="CampusGenie - AI for Smarter Learning",
    version="2.0.0",
    description=(
        "Enterprise academic assistant powered by LangGraph + RAG + "
        "Gemini 2.5 Flash + ChromaDB"
    ),
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup event — warm up AI models so first request is not slow
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_warmup():
    """Pre-load embedding model, ChromaDB, and configure LangSmith on startup."""
    import asyncio
    import concurrent.futures

    # ── LangSmith tracing ──────────────────────────────────────────────────
    # Must be set as real env vars BEFORE any langchain/langgraph import
    # happens inside worker threads, so we do it here at startup.
    from ai_engine.core.config import ai_config as _ai_cfg
    if _ai_cfg.ENABLE_LANGSMITH_TRACING and _ai_cfg.LANGSMITH_API_KEY:
        os.environ["LANGSMITH_TRACING"]   = "true"
        os.environ["LANGCHAIN_TRACING_V2"] = "true"   # legacy key, still read by older langchain
        os.environ["LANGSMITH_API_KEY"]    = _ai_cfg.LANGSMITH_API_KEY
        os.environ["LANGSMITH_ENDPOINT"]   = _ai_cfg.LANGSMITH_ENDPOINT
        os.environ["LANGSMITH_PROJECT"]    = _ai_cfg.LANGSMITH_PROJECT
        print(
            f"✅ LangSmith tracing enabled | "
            f"project: {_ai_cfg.LANGSMITH_PROJECT} | "
            f"endpoint: {_ai_cfg.LANGSMITH_ENDPOINT}"
        )
    else:
        print("ℹ️  LangSmith tracing disabled")

    def _warmup():
        try:
            from ai_engine.embeddings.model import get_embedding_model
            from ai_engine.embeddings.reranker import get_reranker
            from ai_engine.vectorstore.manager import get_vector_store

            model = get_embedding_model()
            reranker = get_reranker()
            vs = get_vector_store()
            print(
                f"✅ AI Engine ready | "
                f"Embedding dim: {model.dimension} | "
                f"ChromaDB chunks: {vs.count()}"
            )
        except Exception as e:
            print(f"⚠️  AI Engine warmup warning: {e}")

    loop = asyncio.get_event_loop()
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    loop.run_in_executor(executor, _warmup)


# ---------------------------------------------------------------------------
# Auth endpoints (kept in main.py as-is from original)
# ---------------------------------------------------------------------------

@app.post("/api/auth/login", response_model=schemas.Token)
async def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    if not user_credentials.email.endswith(f"@{settings.UNIVERSITY_EMAIL_DOMAIN}"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email must be from {settings.UNIVERSITY_EMAIL_DOMAIN} domain",
        )

    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()

    if not user or not auth.verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer", "user": user}


@app.post("/api/auth/register", response_model=schemas.UserResponse)
async def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/api/auth/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.get("/")
async def root():
    return {"message": "CampusGenie - AI for Smarter Learning API v2.0"}


# ---------------------------------------------------------------------------
# Register all routers
# ---------------------------------------------------------------------------

# Existing application routers (unchanged)
app.include_router(auth_router, tags=["auth"])
app.include_router(student_router, tags=["students"])
app.include_router(faculty_router, tags=["faculty"])
app.include_router(faculty_simple_router, tags=["faculty-simple"])
app.include_router(admin_router, tags=["admin"])
app.include_router(task_router, tags=["tasks"])
app.include_router(document_router, tags=["documents"])
app.include_router(calendar_router, tags=["calendar"])
app.include_router(registrar_router, tags=["registrar"])
app.include_router(school_router, tags=["schools"])
app.include_router(oauth_router, tags=["oauth"])

# AI Engine routers (new enterprise system)
app.include_router(ai_assistant_router, prefix="/api/ai", tags=["ai-assistant"])
app.include_router(ai_document_router, prefix="/api/ai", tags=["ai-documents"])
app.include_router(ai_health_router, prefix="/api/ai", tags=["ai-health"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, reload=False)
