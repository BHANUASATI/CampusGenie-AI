from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.rag import router as rag_router
from app.models.database import init_db

# Setup logging
setup_logging()

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
app.include_router(rag_router, prefix="/rag", tags=["rag"])


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"LLM Provider: {settings.LLM_PROVIDER}")
    logger.info(f"Vector DB: {settings.VECTOR_DB_TYPE}")
    
    # Initialize database
    init_db()
    logger.info("Database initialized successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down application")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "CampusGenie AI - AI for Smarter Learning",
        "version": settings.APP_VERSION,
        "status": "operational"
    }
