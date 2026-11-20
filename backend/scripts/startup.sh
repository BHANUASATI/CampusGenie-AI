#!/bin/bash
set -e

echo "=== CampusGenie Startup ==="

# 1. Init database (idempotent)
echo "[1/3] Initializing database..."
PYTHONPATH=src python3 scripts/init_db.py

# 2. Start server FIRST so Railway health check passes
echo "[2/3] Starting API server on port ${PORT:-8080}..."
cd src && python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} &
SERVER_PID=$!

# 3. Wait for server to be ready, then index documents in background
echo "[3/3] Waiting for server then syncing knowledge base..."
sleep 15

PYTHONPATH=/app/src python3 - << 'PYEOF' &
import subprocess, sys, os, time
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
        continue
    url = f"{REPO}/{fname.replace(' ', '%20')}"
    r = subprocess.run(["curl", "-sL", url, "-o", out], capture_output=True)
    size = os.path.getsize(out) if os.path.exists(out) else 0
    print(f"  downloaded: {fname} ({size} bytes)", flush=True)

# Index only new files
from ai_engine.document_pipeline.indexer import index_document_from_path
from ai_engine.vectorstore.manager import get_vector_store

vs = get_vector_store()
already = {d["source_file"] for d in vs.list_sources()}
print(f"Already indexed: {len(already)} docs, {vs.count()} chunks", flush=True)

ok = fail = 0
for fname in files:
    if fname in already:
        continue
    fpath = f"{DEST}/{fname}"
    if not os.path.exists(fpath) or os.path.getsize(fpath) < 1000:
        continue
    print(f"  indexing: {fname}...", end=" ", flush=True)
    try:
        index_document_from_path(fpath, doc_type="knowledge_base", department="all")
        print("OK", flush=True); ok += 1
    except Exception as e:
        print(f"FAIL: {e}", flush=True); fail += 1

print(f"Knowledge base ready: {vs.count()} total chunks ({ok} new, {fail} failed)", flush=True)
PYEOF

# Keep container alive by waiting for server process
wait $SERVER_PID
