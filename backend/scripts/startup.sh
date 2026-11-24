#!/bin/bash
set -e

echo "=== CampusGenie Startup ==="
cd /app

export PYTHONPATH=/app:/app/src

# 1. Init database (idempotent)
echo "[1/3] Initializing database..."
python3 scripts/init_db.py

# 2. Rebuild the AI index from the document files on disk.  The image bakes in
#    an index, but Railway may mount an empty volume over CHROMA_PERSIST_DIR,
#    which previously left the chatbot with almost no documents after redeploy.
if [ "${REBUILD_INDEX_ON_STARTUP:-1}" = "1" ]; then
    echo "[2/3] Rebuilding AI knowledge base from documents on disk..."
    python3 scripts/rebuild_index.py
else
    echo "[2/3] Rebuild disabled; indexing only missing documents..."
    python3 scripts/index_docs.py
fi

# 3. Start API server
echo "[3/3] Starting server on port ${PORT:-8080}..."
exec python3 -m uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8080}"
