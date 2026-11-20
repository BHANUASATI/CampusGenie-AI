FROM python:3.11-slim

# System dependencies for sentence-transformers, PDF libs, and MySQL client
# libmariadb-dev replaces libmysqlclient-dev on Debian trixie (Python 3.11-slim)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    pkg-config \
    libmariadb-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    # Install CPU-only torch from PyTorch's index.
    # 2.6.0+cpu is the latest wheel available for cp311-linux_x86_64.
    # --extra-index-url keeps PyPI available for torch's own deps (sympy, etc.)
    pip install --no-cache-dir \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        "torch==2.6.0+cpu" && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Pre-download the ML models at build time so the container starts fast
RUN python3 -c "\
from sentence_transformers import SentenceTransformer, CrossEncoder; \
SentenceTransformer('all-MiniLM-L6-v2'); \
CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2'); \
print('Models cached.')"

# Create uploads directory
RUN mkdir -p src/uploads/profile_images src/uploads/ai_documents

EXPOSE 8080

# Startup script: download+index documents, init DB, start server
COPY scripts/startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

CMD ["/app/startup.sh"]
