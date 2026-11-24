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
import threading
import uuid
from pathlib import Path
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

# Background uploads need observable state. Without this the UI reports
# "queued" even when extraction/embedding fails, which is exactly what made
# uploads look successful while nothing appeared in the knowledge base.
_upload_jobs: dict = {}
_upload_jobs_lock = threading.Lock()


def _update_job(job_id: str, **changes) -> None:
    with _upload_jobs_lock:
        _upload_jobs.setdefault(job_id, {}).update(changes)


def _require_admin(current_user: models.User):
    """Helper to check if user is admin/registrar."""
    if current_user.role not in (models.UserRole.ADMIN, models.UserRole.REGISTRAR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage documents",
        )


@router.post("/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
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
    File is saved to permanent storage first, then indexed in background.
    """
    _require_admin(current_user)

    # Save uploaded file to temp location
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp:
        temp.write(await file.read())
        temp_path = temp.name

    job_id = uuid.uuid4().hex
    _update_job(
        job_id,
        status="processing",
        filename=file.filename,
        doc_type=doc_type,
        message="Reading, chunking and embedding the document…",
        chunks_indexed=0,
        error=None,
    )

    service = DocumentService()

    def _process_and_cleanup():
        """Run indexing then delete the temp file. Permanent file is kept even on failure."""
        try:
            stats = service.upload_and_index(
                temp_path,
                file.filename,
                doc_type,
                department,
                semester,
                academic_year,
            )
            source_file = stats.get("source_file") or Path(temp_path).name
            message = (
                f'"{source_file}" indexed — '
                f'{stats.get("chunks_indexed", 0)} chunks are now searchable.'
            )
            _update_job(
                job_id,
                status="completed",
                source_file=source_file,
                chunks_indexed=stats.get("chunks_indexed", 0),
                message=message,
            )
            logger.info(
                "document.index_success",
                extra={"filename": file.filename, "doc_type": doc_type, **stats},
            )
        except Exception as exc:
            message = f'Indexing failed for "{file.filename}": {exc}'
            _update_job(job_id, status="failed", error=str(exc), message=message)
            logger.error(
                "document.index_failed",
                extra={
                    "filename": file.filename,
                    "doc_type": doc_type,
                    "error": str(exc),
                },
            )
        finally:
            # Only remove the temp file — permanent copy is kept by document_service
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    background_tasks.add_task(_process_and_cleanup)

    return {
        "message": "Document upload started",
        "filename": file.filename,
        "doc_type": doc_type,
        "status": "processing",
        "job_id": job_id,
    }


@router.get("/documents/jobs/{job_id}")
async def get_upload_job(
    job_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Poll the status of an admin document upload."""
    _require_admin(current_user)
    with _upload_jobs_lock:
        job = dict(_upload_jobs.get(job_id) or {})
    if not job:
        raise HTTPException(status_code=404, detail="Upload job not found")
    return job


@router.post("/documents/reindex")
async def reindex_all_documents(
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Re-index all documents sitting in AI_DOCUMENTS_DIR that are not yet indexed.
    Safe to call multiple times — already-indexed files are skipped.
    """
    _require_admin(current_user)

    from ai_engine.core.config import ai_config
    from ai_engine.document_pipeline.indexer import index_document_from_path
    from pathlib import Path

    docs_dir = Path(ai_config.AI_DOCUMENTS_DIR)
    allowed_ext = set(ai_config.ALLOWED_DOCUMENT_EXTENSIONS)

    service = DocumentService()
    already_indexed = {d["source_file"] for d in service.list_documents()}

    files_to_index = [
        f for f in docs_dir.iterdir()
        if f.is_file() and f.suffix.lower() in allowed_ext and f.name not in already_indexed
    ]

    def _run_reindex():
        indexed, failed = 0, 0
        for f in files_to_index:
            try:
                index_document_from_path(
                    file_path=str(f),
                    doc_type="knowledge_base",
                    department="all",
                )
                indexed += 1
                logger.info("reindex.success", extra={"file": f.name})
            except Exception as e:
                failed += 1
                logger.error("reindex.failed", extra={"file": f.name, "error": str(e)})

    background_tasks.add_task(_run_reindex)

    return {
        "message": f"Reindex started for {len(files_to_index)} files",
        "files_queued": [f.name for f in files_to_index],
        "already_indexed": len(already_indexed),
    }


@router.post("/documents/bootstrap")
async def bootstrap_knowledge_base(
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Download documents from GitHub and index them.
    Use this after a fresh deploy when the filesystem is empty.
    Safe to call multiple times — already-indexed files are skipped.
    """
    _require_admin(current_user)

    REPO = "https://raw.githubusercontent.com/BHANUASATI/CampusGenie-AI/main/Documents"
    DEST = "/app/uploads/ai_documents"
    FILES = [
        "KRMU_Attendance_Policy_RAG_Knowledge_Base_v3.docx",
        "KRMU_Academic_Timetable_Notice_MCA_BCA_BTech_RAG_v1.docx",
        "KRMU_Hostel_Residential_Life_Policy_RAG_v1.docx",
        "KRMU_Campus_Event_Notice_RAG_v1.docx",
        "KRMU_Semester_Fee_Submission_Notice_2026_27.docx",
        "KR_Mangalam_University_EDM_Fest_2026_Event_Document.docx",
        "KRMU_Master_Timetable_RAG_Test_v2.docx",
        "MCA2025-27Handbook_Core(14-07-25).pdf",
    ]

    def _run():
        import subprocess
        import os
        from pathlib import Path
        from ai_engine.document_pipeline.indexer import index_document_from_path
        from ai_engine.vectorstore.manager import get_vector_store

        Path(DEST).mkdir(parents=True, exist_ok=True)
        vs = get_vector_store()
        already = {d["source_file"] for d in vs.list_sources()}

        downloaded = ok = fail = 0
        for fname in FILES:
            out = os.path.join(DEST, fname)
            # Download if missing
            size = os.path.getsize(out) if os.path.exists(out) else 0
            if size < 1000:
                import urllib.parse
                url = f"{REPO}/{urllib.parse.quote(fname)}"
                subprocess.run(["curl", "-sL", url, "-o", out], capture_output=True)
                size = os.path.getsize(out) if os.path.exists(out) else 0
                if size > 1000:
                    downloaded += 1
                    logger.info("bootstrap.downloaded", extra={"file": fname, "size": size})
                else:
                    logger.error("bootstrap.download_failed", extra={"file": fname})
                    continue

            # Index if not already done
            if fname in already:
                logger.info("bootstrap.skip_indexed", extra={"file": fname})
                continue
            try:
                index_document_from_path(out, doc_type="knowledge_base", department="all")
                ok += 1
                logger.info("bootstrap.indexed", extra={"file": fname})
            except Exception as e:
                fail += 1
                logger.error("bootstrap.index_failed", extra={"file": fname, "error": str(e)})

        total = vs.count()
        logger.info("bootstrap.done", extra={
            "total_chunks": total, "downloaded": downloaded,
            "indexed": ok, "failed": fail
        })

    background_tasks.add_task(_run)

    return {
        "message": "Bootstrap started — downloading and indexing documents in background",
        "files": FILES,
        "status": "running",
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
