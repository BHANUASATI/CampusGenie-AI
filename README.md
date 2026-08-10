<div align="center">

# CampusGenie — AI for Smarter Learning With ERP Service

### Transforming Educational Administration Through Agentic AI

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-FF6B35?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-0.4-4A90D9?style=for-the-badge)](https://www.trychroma.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[Overview](#overview) • [Features](#features) • [Architecture](#architecture) • [How to Run](#how-to-run) • [AI Engine](#ai-engine) • [API Reference](#api-reference) • [Troubleshooting](#troubleshooting) • [Contributing](#contributing)

</div>

---

## Overview

**CampusGenie** is a full-stack university management platform built around an enterprise-grade AI assistant. Students, faculty, and registrars get a single portal to handle documents, timetables, attendance, grades, and calendars — all backed by a conversational AI agent that answers academic queries using Retrieval-Augmented Generation (RAG) over university knowledge documents.

### Why CampusGenie?

- **Agentic AI** — LangGraph orchestrates intent classification, parallel RAG retrieval + live DB tool calls, and answer generation in a single compiled graph
- **Dual LLM providers** — Gemini 2.5 Flash as primary, OpenRouter as automatic fallback (zero downtime if Gemini quota is hit)
- **Semantic search** — ChromaDB vector store with local `sentence-transformers` embeddings + cross-encoder reranking
- **Multi-role** — Student, Faculty, Admin, and Registrar portals with JWT + RBAC
- **Document workflow** — Upload → Faculty review → Verified/Rejected with email notifications

---

## Features

### AI Assistant
- Conversational academic Q&A with memory (last 6 turns)
- RAG over admin-uploaded knowledge documents (PDF, DOCX, TXT, CSV, MD)
- Live database tool calls — timetable, attendance, grades, deadlines
- Intent classification routes each query to the right pipeline
- Automatic Gemini → OpenRouter fallback on API failures or quota exhaustion

### Academic Management
- Multi-school hierarchy: School → Department → Course
- Student enrollment with auto-generated profiles
- GPA tracking and academic performance analytics
- Task and deadline management with calendar integration

### Document Management
- Drag-and-drop upload with file type and size validation
- Real-time status tracking: Pending / Verified / Rejected / Missing
- Faculty review queue with rejection reasons
- Email notifications on status changes

### User Portals

| Role | Key Capabilities |
|------|-----------------|
| **Student** | Upload documents, view grades/attendance, chat with AI |
| **Faculty** | Verify documents, view student records, manage timetables |
| **Admin** | User management, course setup, upload AI knowledge docs |
| **Registrar** | Full oversight, analytics, bulk operations |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│               React 19 + TypeScript + Tailwind               │
│                      localhost:3000                          │
└───────────────────────────┬──────────────────────────────────┘
                            │ REST API (JWT)
┌───────────────────────────▼──────────────────────────────────┐
│                     FastAPI Backend                          │
│                      localhost:8002                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                AI Engine (LangGraph)                 │    │
│  │                                                      │    │
│  │   START → load_memory → classify_intent             │    │
│  │                  ↙               ↘                  │    │
│  │      retrieve_context         tool_call             │    │
│  │       (ChromaDB RAG)       (Live DB queries)        │    │
│  │                  ↘               ↙                  │    │
│  │              generate_answer                        │    │
│  │           (Gemini / OpenRouter)                     │    │
│  │                  ↓                                  │    │
│  │            save_memory → END                        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  MySQL 8.0+  (users, documents, timetables, attendance)     │
│  ChromaDB    (knowledge document embeddings)                 │
└──────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, React Router v7 |
| Backend | Python 3.11, FastAPI 0.104, SQLAlchemy 2.0, Pydantic v2 |
| AI Orchestration | LangGraph 0.2, LangChain 0.2 |
| LLM — Primary | Google Gemini 2.5 Flash (`google-generativeai`) |
| LLM — Fallback | OpenRouter via `openai` SDK (nvidia/nemotron-ultra) |
| Embeddings | `sentence-transformers` — `all-MiniLM-L6-v2` (local, CPU) |
| Reranking | `sentence-transformers` — `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| Vector Store | ChromaDB 0.4 (persistent, local) |
| Database | MySQL 8.0+ |
| Auth | JWT (`python-jose`) + bcrypt (`passlib`) |
| OAuth | Microsoft Azure AD (MSAL) |
| Observability | LangSmith tracing (optional) |

---

## How to Run

### Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| MySQL | 8.0+ | `mysql --version` |
| Git | any | `git --version` |

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/yourusername/CampusGenie-AI.git
cd CampusGenie-AI
```

---

### Step 2 — Set Up the Database

Start MySQL and create the database:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE CampusGenie;
USE CampusGenie;
SOURCE database/database_schema_mysql_final.sql;
SOURCE database/sample_data_mysql_final.sql;
EXIT;
```

---

### Step 3 — Configure the Backend

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in the required values:

```env
# --- Required ---
DATABASE_URL=mysql+mysqlconnector://root:YOUR_PASSWORD@localhost:3306/CampusGenie
SECRET_KEY=change-this-to-a-long-random-string

# --- AI (at least one LLM key is required) ---
GEMINI_API_KEY=your-gemini-api-key
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key

# --- Optional ---
SMTP_USERNAME=you@gmail.com
SMTP_PASSWORD=your-app-password
LANGSMITH_API_KEY=your-langsmith-key
ENABLE_LANGSMITH_TRACING=false
```

> Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/app/apikey).
> Get a free OpenRouter key at [openrouter.ai](https://openrouter.ai/keys).

---

### Step 4 — Install Backend Dependencies

```bash
# From the backend/ directory
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install all dependencies
pip install -r requirements.txt
```

> The first run will also download the embedding and reranker models (~90 MB) from Hugging Face automatically.

---

### Step 5 — Start the Backend Server

```bash
# From the backend/ directory, with venv activated
PYTHONPATH=src uvicorn src.main:app --host 0.0.0.0 --port 8002 --reload
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8002
✅ AI Engine ready | Embedding dim: 384 | ChromaDB chunks: 0
```

---

### Step 6 — Install Frontend Dependencies

Open a **new terminal** and run:

```bash
cd frontend
npm install
```

---

### Step 7 — Start the Frontend

```bash
# From the frontend/ directory
npm start
```

The browser will open automatically at `http://localhost:3000`.

---

### Step 8 — Access the Application

| Service | URL |
|---------|-----|
| Frontend app | http://localhost:3000 |
| Backend API | http://localhost:8002 |
| Swagger / API docs | http://localhost:8002/docs |
| ReDoc | http://localhost:8002/redoc |
| AI health check | http://localhost:8002/api/ai/health |

---

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Registrar | `registrar@university.edu.in` | `registrar123` |
| Student | `student@university.edu.in` | `student123` |
| Faculty | `faculty@university.edu.in` | `faculty123` |

> Change all passwords before any public or production deployment.

---

### Upload AI Knowledge Documents (Optional)

To enable the RAG-based AI assistant to answer questions about your university:

1. Log in as **Admin**
2. Navigate to the AI Documents section
3. Upload PDFs, DOCX, or TXT files (syllabi, handbooks, policies, etc.)

Or use the API directly:

```bash
curl -X POST http://localhost:8002/api/ai/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@your_document.pdf"
```

Supported formats: `.pdf`, `.docx`, `.txt`, `.csv`, `.md` (max 50 MB each).

---

## Project Structure

```
CampusGenie-AI/
├── backend/
│   ├── src/                          # FastAPI application
│   │   ├── main.py                   # Entry point — mounts all routers
│   │   ├── models.py                 # SQLAlchemy ORM models
│   │   ├── schemas.py                # Pydantic request/response schemas
│   │   ├── auth.py                   # JWT helpers (create/verify tokens)
│   │   ├── database.py               # DB engine, session, Base
│   │   ├── config.py                 # App settings (pydantic-settings)
│   │   ├── dependencies.py           # FastAPI dependency injectors
│   │   ├── auth_routes.py            # /api/auth/* endpoints
│   │   ├── student_routes.py         # /api/students/* endpoints
│   │   ├── faculty_routes_new.py     # /api/faculty/* endpoints
│   │   ├── admin_routes.py           # /api/admin/* endpoints
│   │   ├── registrar_routes.py       # /api/registrar/* endpoints
│   │   ├── document_routes.py        # /documents/* endpoints
│   │   ├── calendar_routes.py        # /api/calendar/* endpoints
│   │   ├── task_routes.py            # /api/tasks/* endpoints
│   │   ├── school_routes.py          # /api/schools/* endpoints
│   │   ├── oauth_routes.py           # Azure AD OAuth endpoints
│   │   └── email_service.py          # SMTP email notifications
│   │
│   ├── ai_engine/                    # Self-contained agentic AI system
│   │   ├── agents/                   # LangGraph node implementations
│   │   │   ├── memory_manager.py     # load_memory / save_memory nodes
│   │   │   ├── intent_classifier.py  # classify_intent node
│   │   │   ├── retriever.py          # retrieve_context node (ChromaDB)
│   │   │   ├── tool_caller.py        # tool_call node (live DB queries)
│   │   │   └── answer_generator.py   # generate_answer node (LLM)
│   │   ├── api/                      # AI FastAPI routers
│   │   │   ├── ai_routes.py          # /api/ai/conversations/* endpoints
│   │   │   ├── document_routes.py    # /api/ai/documents/* endpoints
│   │   │   └── health.py             # /api/ai/health endpoint
│   │   ├── core/
│   │   │   ├── config.py             # AI engine settings (AIEngineConfig)
│   │   │   ├── logging.py            # Structured logging setup
│   │   │   ├── exceptions.py         # Custom exception classes
│   │   │   └── security.py           # Prompt injection / PII scan
│   │   ├── document_pipeline/
│   │   │   ├── extractor.py          # Extract text from PDF/DOCX/TXT/CSV
│   │   │   ├── cleaner.py            # Normalize / clean extracted text
│   │   │   ├── chunker.py            # Split into 512-token chunks
│   │   │   └── indexer.py            # Embed chunks and store in ChromaDB
│   │   ├── embeddings/
│   │   │   ├── model.py              # SentenceTransformer singleton
│   │   │   └── reranker.py           # CrossEncoder singleton
│   │   ├── graph/
│   │   │   ├── orchestrator.py       # Build + run the LangGraph
│   │   │   └── edges.py              # Conditional routing logic
│   │   ├── llm/
│   │   │   └── client.py             # call_llm() — Gemini → OpenRouter fallback
│   │   ├── prompts/
│   │   │   ├── system_prompt.py      # Main system persona prompt
│   │   │   ├── rag_prompt.py         # RAG answer generation prompt
│   │   │   ├── intent_prompt.py      # Intent classification prompt
│   │   │   └── safety_prompt.py      # Safety / guardrails prompt
│   │   ├── repositories/             # Conversation history DB repo
│   │   ├── schemas/                  # AgentState, response types
│   │   ├── services/                 # ChatService, DocumentService
│   │   └── vectorstore/              # ChromaDB client + collection manager
│   │
│   ├── chroma_db/                    # ChromaDB data (git-ignored)
│   ├── uploads/ai_documents/         # Uploaded knowledge docs (git-ignored)
│   ├── tests/                        # Backend test suite
│   ├── scripts/                      # DB init and migration utilities
│   ├── docs/                         # Backend-specific docs
│   ├── requirements.txt              # Python dependencies
│   └── .env.example                  # Environment variable template
│
├── frontend/
│   ├── src/
│   │   ├── components/               # Shared UI components
│   │   ├── pages/                    # Route-level page components
│   │   ├── services/                 # Axios API client modules
│   │   ├── context/                  # React context providers (auth, etc.)
│   │   ├── types/                    # TypeScript type definitions
│   │   ├── utils/                    # Utility functions
│   │   └── styles/                   # Global and component styles
│   ├── public/                       # Static assets
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── database/
│   ├── database_schema_mysql_final.sql   # Full MySQL schema
│   ├── sample_data_mysql_final.sql       # Seed data for development
│   └── SCHEMA_DOCUMENTATION.md
│
├── docs/                             # Project-wide documentation
├── scripts/                          # Project utility shell scripts
├── tests/                            # Root-level integration tests
├── .gitignore
└── README.md
```

---

## Environment Variables

Full reference for `backend/.env`:

```env
# ── Database ──────────────────────────────────────────────────────────────
DATABASE_URL=mysql+mysqlconnector://root:password@localhost:3306/CampusGenie

# ── JWT ───────────────────────────────────────────────────────────────────
SECRET_KEY=change-me-in-production          # min 32 random chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ── University domain (restricts registration to this domain) ─────────────
UNIVERSITY_EMAIL_DOMAIN=university.edu.in

# ── CORS (add your frontend URL) ──────────────────────────────────────────
ALLOWED_ORIGINS=["http://localhost:3000"]

# ── Email notifications (optional) ────────────────────────────────────────
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=you@gmail.com
SMTP_PASSWORD=your-app-password            # Use a Gmail App Password
FROM_EMAIL=you@gmail.com

# ── Gemini (primary LLM) ──────────────────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_TEMPERATURE=0.1
GEMINI_MAX_OUTPUT_TOKENS=2048

# ── OpenRouter (fallback LLM) ─────────────────────────────────────────────
OPENROUTER_API_KEY=sk-or-v1-your-key
LLM_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_TEMPERATURE=0.3

# ── Azure AD OAuth (optional) ─────────────────────────────────────────────
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-tenant-id
AZURE_REDIRECT_URI=http://localhost:3000/auth/callback

# ── LangSmith observability (optional) ────────────────────────────────────
ENABLE_LANGSMITH_TRACING=false
LANGSMITH_API_KEY=your-langsmith-key
LANGSMITH_PROJECT=CampusGenie
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

---

## AI Engine

The AI engine lives in `backend/ai_engine/` and is a fully self-contained agentic system built on LangGraph.

### How a Chat Message Flows

```
User Message
    │
    ▼
1. load_memory         Load last 6 conversation turns from MySQL
    │
    ▼
2. classify_intent     LLM call → one of: greeting | timetable |
    │                  attendance | grades | documents |
    │                  general_academic | unknown
    │
    ├──────────────────────────────────────┐
    ▼                                      ▼
3a. retrieve_context                   3b. tool_call
    Embed query → ChromaDB search          Run live SQL query
    → CrossEncoder rerank → top 3          (timetable, grades, etc.)
    │                                      │
    └──────────────────┬───────────────────┘
                       ▼
4. generate_answer     LLM call with system prompt + RAG context
    │                  + tool result + conversation history
    ▼
5. save_memory         Persist both turns to MySQL
    │
    ▼
Response → User
```

### LLM Fallback Strategy

Every call goes through `ai_engine/llm/client.py`:

```
call_llm(prompt)
  ├─ try Gemini 2.5 Flash  ✅ → return result
  └─ except (quota / error)
        └─ try OpenRouter (nvidia/nemotron) ✅ → return result (fallback_used=True)
              └─ except → raise RuntimeError (both providers failed)
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login, returns JWT access token |
| `POST` | `/api/auth/register` | Register a new user |
| `GET` | `/api/auth/me` | Get current authenticated user |

### AI Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai/conversations` | List all conversations for current user |
| `POST` | `/api/ai/conversations` | Start a new conversation |
| `POST` | `/api/ai/conversations/{id}/messages` | Send a message |
| `GET` | `/api/ai/health` | AI engine health check |
| `POST` | `/api/ai/documents/upload` | Upload a knowledge document (admin only) |
| `GET` | `/api/ai/documents` | List uploaded knowledge documents |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/documents/my-documents-status` | Student document status |
| `POST` | `/documents/upload` | Upload a document |
| `PUT` | `/documents/{id}/verify` | Verify a document (faculty) |
| `PUT` | `/documents/{id}/reject` | Reject a document with reason (faculty) |

> Full interactive docs available at **http://localhost:8002/docs** after starting the server.

---

## Troubleshooting

**`ModuleNotFoundError: No module named 'src'` or similar import errors**
```bash
# Always run uvicorn with PYTHONPATH set to backend/src
PYTHONPATH=src uvicorn src.main:app --host 0.0.0.0 --port 8002 --reload
```

**`Address already in use` on port 8002**
```bash
lsof -ti:8002 | xargs kill -9
```

**`ImportError: cannot import name 'cached_download' from 'huggingface_hub'`**
```bash
pip install "sentence-transformers>=2.7.0"
```
This is already the pinned version in `requirements.txt`.

**`InvalidUpdateError` in LangGraph (parallel branch merge)**
Ensure `backend/ai_engine/schemas/agent_state.py` uses `Annotated[T, _keep_last]` on all input and classification fields. This is fixed in the current codebase.

**Gemini quota exceeded**
The fallback to OpenRouter is automatic. Check backend logs for:
```
llm.call.gemini.failed — falling back to OpenRouter
llm.call.openrouter.success
```

**Frontend stuck on a port other than 3000**
```bash
pkill -f "react-scripts"
PORT=3000 npm start
```

**MySQL connection refused**
```bash
# Verify MySQL is running
mysql -u root -p -e "SHOW DATABASES;"
# Check DATABASE_URL in backend/.env matches your MySQL credentials
```

**ChromaDB collection empty (AI gives generic answers)**
Upload knowledge documents via Admin panel or the `/api/ai/documents/upload` endpoint.

---

## Contributing

1. Fork the repo and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes, following the existing code style
3. Test your changes end-to-end (backend + frontend)
4. Commit with a clear message:
   ```bash
   git commit -m "feat: describe your change"
   ```
5. Push and open a Pull Request against `main`

### Commit Convention

| Prefix | Use for |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change with no feature or fix |
| `perf:` | Performance improvement |
| `chore:` | Build, tooling, or dependency updates |

---

## Roadmap

- [x] Multi-role JWT authentication
- [x] Document upload and verification workflow
- [x] LangGraph agentic AI assistant
- [x] RAG with ChromaDB + sentence-transformers
- [x] Gemini → OpenRouter automatic fallback
- [x] LangSmith observability tracing
- [x] Azure AD OAuth integration
- [ ] Streaming chat responses (SSE)
- [ ] Docker Compose for one-command startup
- [ ] Bulk document upload for admins
- [ ] Two-factor authentication (TOTP)
- [ ] Mobile app (React Native)
- [ ] CI/CD pipeline (GitHub Actions)

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with Python, FastAPI, React, LangGraph, and Gemini

**Found this useful? Drop a ⭐**

</div>
