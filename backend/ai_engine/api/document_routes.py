"""
Document Management Routes
===========================
Admin-only endpoints for uploading institutional knowledge documents.

NEW endpoints (not in existing app):
  POST   /api/ai/documents/upload       — upload + index a document
  GET    /api/ai/documents               — list all indexed documents
  DELETE /api/ai/documents/{filename}    — remove document from vector store
  GET    /api/ai/documents/stats         — get indexing statistics
"""

from __future__ import annotations

import os
import sys
import tempfile
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

_SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "src")
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

import models
from database import get_db
from dependencies import get_current_user

from ai_engine.core.logging import get_logger
from ai_engine.services.document_service import DocumentService

logger = get_logger(__name__)
router = APIRouter()


def _require_admin(current_user: models.User):
    """Helper to check if user is admin/registrar."""
    if current_user.role not in (models.UserRole.ADMIN, models.UserRole.REGISTRAR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage documents",
        )


@router.post("/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,   # FastAPI injects this automatically by type
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    department: str = Form("all"),
    semester: int = Form(None),
    academic_year: str = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload and index a document.
    
    Processing happens in the background to avoid blocking.
    """
    _require_admin(current_user)

    # Save uploaded file to temp location
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp:
        temp.write(await file.read())
        temp_path = temp.name

    service = DocumentService()

    def _process_and_cleanup():
        """Run indexing then delete the temp file regardless of outcome."""
        try:
            service.upload_and_index(
                temp_path,
                file.filename,
                doc_type,
                department,
                semester,
                academic_year,
            )
        except Exception as exc:
            logger.error(
                "document.index_failed",
                extra={
                    "filename": file.filename,
                    "doc_type": doc_type,
                    "error": str(exc),
                },
            )
        finally:
            # Always remove the temp file to avoid leaking disk space
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    # Process in background
    background_tasks.add_task(_process_and_cleanup)

    return {
        "message": "Document upload started",
        "filename": file.filename,
        "doc_type": doc_type,
        "status": "processing",
    }


@router.get("/documents")
async def list_documents(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all indexed documents."""
    _require_admin(current_user)
    service = DocumentService()
    return {"documents": service.list_documents()}


@router.delete("/documents/{source_file}")
async def delete_document(
    source_file: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a document from the vector store."""
    _require_admin(current_user)
    service = DocumentService()
    count = service.delete_document(source_file)
    return {"message": f"Deleted {count} chunks", "source_file": source_file}


@router.get("/documents/stats")
async def get_document_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get vector store statistics."""
    _require_admin(current_user)
    service = DocumentService()
    return service.get_stats()
