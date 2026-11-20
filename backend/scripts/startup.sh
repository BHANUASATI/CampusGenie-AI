#!/bin/bash
set -e

echo "=== CampusGenie Startup ==="
cd /app

export PYTHONPATH=/app:/app/src

# 1. Init database (idempotent)
echo "[1/2] Initializing database..."
python3 scripts/init_db.py

# 2. Start API server
# Documents + ChromaDB are baked into the Docker image at build time.
echo "[2/2] Starting server on port ${PORT:-8080}..."
exec python3 -m uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8080}"
