#!/bin/bash
set -e

echo "=== CampusGenie Startup ==="
cd /app

# 1. Init database (idempotent — skips if already done)
echo "[1/2] Initializing database..."
PYTHONPATH=src python3 scripts/init_db.py

# 2. Start server
# Documents and ChromaDB are baked into the image at build time.
# No runtime download needed.
echo "[2/2] Starting API server on port ${PORT:-8080}..."
exec PYTHONPATH=src python3 -m uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8080}"
