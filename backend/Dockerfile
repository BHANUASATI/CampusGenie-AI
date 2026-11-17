FROM python:3.11-slim

# System dependencies for mysqlclient, sentence-transformers, and PDF libs
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    pkg-config \
    default-libmysqlclient-dev \
    libmysqlclient-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Pre-download the ML models at build time so the container starts fast
# and doesn't pull ~100 MB on every cold start
RUN python3 -c "\
from sentence_transformers import SentenceTransformer, CrossEncoder; \
SentenceTransformer('all-MiniLM-L6-v2'); \
CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2'); \
print('Models cached.')"

# Create uploads directory
RUN mkdir -p src/uploads/profile_images src/uploads/ai_documents

EXPOSE 8002

# 1. Run DB init (idempotent — skips if tables/users already exist)
# 2. Start the API server
# Railway injects PORT; fall back to 8002 for local docker runs
CMD ["sh", "-c", "PYTHONPATH=src python3 scripts/init_db.py && cd src && python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8002}"]
