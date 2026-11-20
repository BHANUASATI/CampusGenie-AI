#!/bin/bash
set -e

echo "=== CampusGenie Startup ==="
cd /app

# 1. Init database (idempotent)
echo "[1/3] Initializing database..."
PYTHONPATH=src python3 scripts/init_db.py

# 2. Start server so Railway health check passes immediately
echo "[2/3] Starting API server on port ${PORT:-8080}..."
PYTHONPATH=src python3 -m uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8080}" &
SERVER_PID=$!

# 3. Poll until server is up, then index docs in background
(
  for i in $(seq 1 30); do
    sleep 3
    if curl -sf "http://localhost:${PORT:-8080}/" > /dev/null 2>&1; then
      echo "[3/3] Server ready. Starting knowledge base sync..."
      break
    fi
    echo "  waiting for server... attempt $i"
  done

  REPO="https://raw.githubusercontent.com/BHANUASATI/CampusGenie-AI/main/Documents"
  DEST="/app/uploads/ai_documents"
  mkdir -p "$DEST"

  FILES=(
    "KRMU_Attendance_Policy_RAG_Knowledge_Base_v3.docx"
    "KRMU_Academic_Timetable_Notice_MCA_BCA_BTech_RAG_v1.docx"
    "KRMU_Hostel_Residential_Life_Policy_RAG_v1.docx"
    "KRMU_Campus_Event_Notice_RAG_v1.docx"
    "KRMU_Semester_Fee_Submission_Notice_2026_27.docx"
    "KR_Mangalam_University_EDM_Fest_2026_Event_Document.docx"
    "KRMU_Master_Timetable_RAG_Test_v2.docx"
    "MCA2025-27Handbook_Core(14-07-25).pdf"
  )

  # Download any missing files
  for fname in "${FILES[@]}"; do
    out="$DEST/$fname"
    size=0
    [ -f "$out" ] && size=$(wc -c < "$out" 2>/dev/null || echo 0)
    if [ "$size" -gt 1000 ]; then
      echo "  already present: $fname"
      continue
    fi
    encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$fname")
    curl -sL "$REPO/$encoded" -o "$out"
    size=$(wc -c < "$out" 2>/dev/null || echo 0)
    echo "  downloaded: $fname ($size bytes)"
  done

  # Index documents not yet in ChromaDB
  PYTHONPATH=/app/src python3 /app/scripts/index_docs.py

) &

# Keep container running
wait $SERVER_PID
