from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime
import psutil
import os
from app.core.config import settings

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: str
    version: str
    uptime_seconds: float
    details: Dict[str, Any]


@router.get("", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.
    Returns application health status, uptime, and system metrics.
    """
    try:
        # Get process info
        process = psutil.Process(os.getpid())
        uptime_seconds = (datetime.now() - datetime.fromtimestamp(process.create_time())).total_seconds()
        
        # Memory info
        memory_info = process.memory_info()
        
        details = {
            "memory_usage_mb": round(memory_info.rss / 1024 / 1024, 2),
            "cpu_percent": process.cpu_percent(),
            "status_code": "healthy"
        }
        
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now().isoformat(),
            version=settings.APP_VERSION,
            uptime_seconds=round(uptime_seconds, 2),
            details=details
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Health check failed: {str(e)}"
        )


@router.get("/ping")
async def ping() -> Dict[str, str]:
    """Simple ping endpoint for load balancers."""
    return {"status": "pong"}
