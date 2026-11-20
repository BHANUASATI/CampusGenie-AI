#!/bin/bash
set -e

echo "=== CampusGenie Startup ==="

# 1. Init database (idempotent)
echo "[1/3] Initializing database..."
PYTHONPATH=src python3 scripts/init_db.py

# 2. Download and index documents from GitHub (skips already-indexed ones)
echo "[2/3] Syncing knowledge base documents..."
PYTHONPATH=src python3 - << 'PYEOF'
import subprocess, sys, os
sys.path.insert(0, '/app/src')

REPO = "https://raw.githubusercontent.com/BHANUASATI/CampusGenie-AI/main/Documents"
DEST = "/app/uploads/ai_documents"
os.makedirs(DEST, exist_ok=True)

files = [
    "KRMU_Attendance_Policy_RAG_Knowledge_Base_v3.docx",
    "KRMU_Academic_Timetable_Notice_MCA_BCA_BTech_RAG_v1.docx",
    "KRMU_Hostel_Residential_Life_Policy_RAG_v1.docx",
    "KRMU_Campus_Event_Notice_RAG_v1.docx",
    "KRMU_Semester_Fee_Submission_Notice_2026_27.docx",
    "KR_Mangalam_University_EDM_Fest_2026_Event_Document.docx",
    "KRMU_Master_Timetable_RAG_Test_v2.docx",
    "MCA2025-27Handbook_Core(14-07-25).pdf",
]

# Download missing files
for fname in files:
    out = f"{DEST}/{fname}"
    if os.path.exists(out) and os.path.getsize(out) > 1000:
        print(f"  already present: {fname}")
        continue
    url = f"{REPO}/{fname.replace(' ', '%20')}"
    r = subprocess.run(["curl", "-sL", url, "-o", out], capture_output=True)
    size = os.path.getsize(out) if os.path.exists(out) else 0
    print(f"  downloaded: {fname} ({size} bytes)" if size > 1000 else f"  FAILED: {fname}")

# Index only files not already in ChromaDB
from ai_engine.document_pipeline.indexer import index_document_from_path
from ai_engine.vectorstore.manager import get_vector_store
from ai_engine.vectorstore.collections import DOC_TYPES

vs = get_vector_store()
already = {d["source_file"] for d in vs.list_sources()}
print(f"Already indexed: {len(already)} docs, {vs.count()} chunks")

ok = fail = 0
for fname in files:
    if fname in already:
        print(f"  skip (indexed): {fname}")
        continue
    fpath = f"{DEST}/{fname}"
    if not os.path.exists(fpath) or os.path.getsize(fpath) < 1000:
        continue
    print(f"  indexing: {fname}...", end=" ", flush=True)
    try:
        index_document_from_path(fpath, doc_type="knowledge_base", department="all")
        print("OK"); ok += 1
    except Exception as e:
        print(f"FAIL: {e}"); fail += 1

print(f"Knowledge base: {vs.count()} total chunks ({ok} new, {fail} failed)")
PYEOF

# 3. Start server
echo "[3/3] Starting API server on port ${PORT:-8080}..."
cd src && exec python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
