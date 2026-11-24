FROM python:3.11-slim

# System dependencies for sentence-transformers, PDF libs, MySQL client and
# Tesseract OCR (scanned PDFs are rendered by PyMuPDF and read by pytesseract).
# libmariadb-dev replaces libmysqlclient-dev on Debian trixie (Python 3.11-slim)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    pkg-config \
    libmariadb-dev \
    curl \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    tesseract-ocr-osd \
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

# Pre-download the ML models AND knowledge base documents at build time
# so the container starts with everything ready — no runtime downloads needed.
RUN python3 -c "\
from sentence_transformers import SentenceTransformer, CrossEncoder; \
SentenceTransformer('all-MiniLM-L6-v2'); \
CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2'); \
print('Models cached.')"

# Download knowledge base documents from GitHub at build time
RUN mkdir -p uploads/ai_documents && \
    REPO="https://raw.githubusercontent.com/BHANUASATI/CampusGenie-AI/main/Documents" && \
    for f in \
        "KRMU_Attendance_Policy_RAG_Knowledge_Base_v3.docx" \
        "KRMU_Academic_Timetable_Notice_MCA_BCA_BTech_RAG_v1.docx" \
        "KRMU_Hostel_Residential_Life_Policy_RAG_v1.docx" \
        "KRMU_Campus_Event_Notice_RAG_v1.docx" \
        "KRMU_Semester_Fee_Submission_Notice_2026_27.docx" \
        "KR_Mangalam_University_EDM_Fest_2026_Event_Document.docx" \
        "KRMU_Master_Timetable_RAG_Test_v2.docx" \
        "MCA2025-27Handbook_Core(14-07-25).pdf"; do \
        encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$f"); \
        curl -sL "$REPO/$encoded" -o "uploads/ai_documents/$f" && \
        echo "Downloaded: $f"; \
    done

# Index all documents into ChromaDB at build time
# PYTHONPATH needs both /app (for ai_engine) and /app/src (for src modules)
RUN PYTHONPATH=/app:/app/src python3 scripts/index_docs.py

# Create uploads directory
RUN mkdir -p src/uploads/profile_images src/uploads/ai_documents

EXPOSE 8080

# Startup script: download+index documents, init DB, start server
COPY scripts/startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

CMD ["/app/startup.sh"]
