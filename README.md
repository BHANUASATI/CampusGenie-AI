<div align="center">

# CampusGenie — AI for Smarter Learning

### Transforming Educational Administration Through Agentic AI

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-FF6B35?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-0.4-4A90D9?style=for-the-badge)](https://www.trychroma.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [AI Engine](#-ai-engine) • [API Docs](#-api-reference) • [Contributing](#-contributing)

</div>

---

## Overview

**CampusGenie** is a full-stack university management platform built around an enterprise-grade AI assistant. Students, faculty, and registrars get a single portal to handle documents, timetables, attendance, grades, and calendars — with a conversational AI agent that answers academic queries using Retrieval-Augmented Generation (RAG) over university knowledge documents.

### Why CampusGenie?

- **Agentic AI** — LangGraph orchestrates intent classification, parallel RAG retrieval + live DB tool calls, and answer generation in a single graph
- **Dual LLM providers** — Gemini 2.5 Flash as primary, OpenRouter as automatic fallback (zero downtime if Gemini quota is hit)
- **Semantic search** — ChromaDB vector store with sentence-transformers embeddings + cross-encoder reranking
- **Multi-role** — Student, Faculty, Admin, and Registrar portals with JWT + RBAC
- **Real-time** — Live document verification status, attendance tracking, calendar events

---

## Features

### AI Assistant
- Conversational academic Q&A with memory (last 6 turns)
- RAG over admin-uploaded knowledge documents (PDF, DOCX, TXT, CSV, MD)
- Live database tool calls — timetable, attendance, grades, deadlines
- Intent classification routes each query to the right pipeline
- Automatic Gemini → OpenRouter fallback on API failures

### Academic Management
- Multi-school hierarchy: School → Department → Course
- Student enrollment with auto-generated profiles
- GPA tracking and academic performance analytics
- Task and deadline management

### Document Management
- Drag-and-drop upload with file validation
- Real-time status: Pending / Verified / Rejected / Missing
- Faculty review queue with rejection reasons
- Email notifications on status changes

### User Portals
| Role | Key Capabilities |
|------|----------------|
| **Student** | Upload documents, view grades/attendance, chat with AI |
| **Faculty** | Verify documents, view student records, manage timetables |
| **Admin** | User management, course setup, system configuration |
| **Registrar** | Full oversight, analytics, bulk operations |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│              React 19 + TypeScript + Tailwind               │
│                    localhost:3000                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│                    FastAPI Backend                          │
│                    localhost:8002                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  AI Engine (LangGraph)              │   │
│  │                                                     │   │
│  │  START → load_memory → classify_intent             │   │
│  │               ↙              ↘                     │   │
│  │   retrieve_context      tool_call                  │   │
│  │    (ChromaDB RAG)     (Live DB queries)            │   │
│  │               ↘              ↙                     │   │
│  │            generate_answer                         │   │
│  │         (Gemini / OpenRouter)                      │   │
│  │               ↓                                    │   │
│  │           save_memory → END                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  MySQL (user data, documents, timetables, attendance)      │
│  ChromaDB (knowledge document embeddings)                  │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, React Router v7 |
| Backend | Python 3.11, FastAPI 0.104, SQLAlchemy 2.0, Pydantic v2 |
| AI Orchestration | LangGraph 0.2, LangChain 0.2 |
| LLM (primary) | Google Gemini 2.5 Flash |
| LLM (fallback) | OpenRouter — nvidia/nemotron-3-ultra-550b |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` (local, CPU) |
| Reranking | CrossEncoder `ms-marco-MiniLM-L-6-v2` (local, CPU) |
| Vector Store | ChromaDB 0.4 (persistent) |
| Database | MySQL 8.0+ |
| Auth | JWT (python-jose) + bcrypt |
| Observability | LangSmith tracing |

---

## Quick Start

### Prerequisites

```
Node.js 18+
Python 3.11+
MySQL 8.0+
Git
```

### 1. Clone

```bash
git clone https://github.com/yourusername/CampusGenie.git
cd CampusGenie
```

### 2. Database

```bash
mysql -u root -p
```

```sql
CREATE DATABASE CampusGenie;
USE CampusGenie;
SOURCE database/sample_data_mysql_final.sql;
EXIT;
```

### 3. Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, GEMINI_API_KEY, OPENROUTER_API_KEY, etc.

# Start the server
PYTHONPATH=src uvicorn src.main:app --host 0.0.0.0 --port 8002 --reload
```

### 4. Frontend

```bash
cd frontend
npm install
npm start          # opens http://localhost:3000
```

### 5. Access

| Service | URL |
|---------|-----|
| Frontend app | http://localhost:3000 |
| Backend API | http://localhost:8002 |
| Swagger docs | http://localhost:8002/docs |
| AI health check | http://localhost:8002/api/ai/health |

### Default Login Credentials

```
Registrar:  registrar@university.edu.in  /  registrar123
Student:    student@university.edu.in    /  student123
Faculty:    faculty@university.edu.in    /  faculty123
```

> Change these before any public deployment.

---

## AI Engine

The AI engine lives in `backend/ai_engine/` and is a fully self-contained agentic system.

### How a Chat Message Flows

1. **load_memory** — loads the last 6 conversation turns from MySQL
2. **classify_intent** — LLM call classifies the query into one of: `greeting`, `timetable`, `attendance`, `grades`, `documents`, `general_academic`, `unknown`
3. **Parallel fan-out** (based on classification):
   - `retrieve_context` — embeds the query, searches ChromaDB, reranks top-3 chunks
   - `tool_call` — runs a live SQL query (timetable, attendance, grades, etc.)
4. **generate_answer** — LLM call with system prompt + retrieved docs + tool result + conversation history → structured JSON response
5. **save_memory** — persists both turns to MySQL

### LLM Fallback

Every LLM call goes through `ai_engine/llm/client.py`:

```
call_llm(prompt)
  ├── try: Gemini 2.5 Flash  ✅ → return result
  └── except: log warning
        └── try: OpenRouter (nvidia/nemotron) ✅ → return result (fallback_used=True)
              └── except: raise RuntimeError (both failed)
```

Configure via `.env`:

```env
# Primary
GEMINI_API_KEY=...
GEMINI_CHAT_MODEL=gemini-2.5-flash

# Fallback
OPENROUTER_API_KEY=sk-or-v1-...
LLM_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_TEMPERATURE=0.3
```

### Uploading Knowledge Documents

Admins can upload documents that feed the RAG pipeline via:

```
POST /api/ai/documents/upload
```

Supported formats: `.pdf`, `.docx`, `.txt`, `.csv`, `.md` (up to 50 MB).

Documents are chunked (512 tokens, 50 overlap), embedded locally, and stored in ChromaDB.

---

## Project Structure

```
CampusGenie/
├── backend/
│   ├── src/                        # FastAPI app (routes, models, auth)
│   │   ├── main.py                 # Entry point — mounts all routers
│   │   ├── models.py               # SQLAlchemy models
│   │   ├── auth.py                 # JWT helpers
│   │   └── *_routes.py             # Feature routers
│   ├── ai_engine/                  # Agentic AI system
│   │   ├── agents/                 # LangGraph nodes
│   │   │   ├── answer_generator.py
│   │   │   ├── intent_classifier.py
│   │   │   ├── memory_manager.py
│   │   │   ├── retriever.py
│   │   │   └── tool_caller.py
│   │   ├── api/                    # AI FastAPI routers
│   │   ├── core/                   # Config, logging, exceptions
│   │   ├── document_pipeline/      # Chunking, extraction, indexing
│   │   ├── embeddings/             # Embedding + reranker models
│   │   ├── graph/                  # LangGraph orchestrator + edges
│   │   ├── llm/                    # LLM client with fallback
│   │   │   └── client.py           # Gemini → OpenRouter fallback
│   │   ├── prompts/                # System, RAG, intent prompts
│   │   ├── repositories/           # Conversation DB repo
│   │   ├── schemas/                # AgentState, response types
│   │   ├── services/               # ChatService, DocumentService
│   │   └── vectorstore/            # ChromaDB client + collections
│   ├── chroma_db/                  # ChromaDB data (git-ignored)
│   ├── uploads/ai_documents/       # Uploaded knowledge docs (git-ignored)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/             # Shared UI components
│   │   ├── pages/                  # Route-level pages
│   │   └── services/               # Axios API clients
│   └── package.json
├── database/
│   ├── database_schema_mysql_final.sql
│   └── sample_data_mysql_final.sql
├── docs/                           # Project documentation
├── .gitignore
└── README.md
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
# Database
DATABASE_URL=mysql+mysqlconnector://root:password@localhost:3306/CampusGenie

# JWT
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# University domain (only emails from this domain can register)
UNIVERSITY_EMAIL_DOMAIN=university.edu.in

# Email (optional — for notifications)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=you@gmail.com
SMTP_PASSWORD=your-app-password

# Gemini (primary LLM)
GEMINI_API_KEY=your-gemini-key
GEMINI_CHAT_MODEL=gemini-2.5-flash

# OpenRouter (fallback LLM)
OPENROUTER_API_KEY=sk-or-v1-...
LLM_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_TEMPERATURE=0.3

# LangSmith (optional tracing)
ENABLE_LANGSMITH_TRACING=false
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=CampusGenie
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login, returns JWT |
| `POST` | `/api/auth/register` | Register new user |
| `GET` | `/api/auth/me` | Get current user |

### AI Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai/conversations` | List conversations |
| `POST` | `/api/ai/conversations` | Start new conversation |
| `POST` | `/api/ai/conversations/{id}/messages` | Send message |
| `GET` | `/api/ai/health` | AI engine health check |
| `POST` | `/api/ai/documents/upload` | Upload knowledge doc (admin) |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/documents/my-documents-status` | Student doc status |
| `POST` | `/documents/upload` | Upload document |
| `PUT` | `/documents/{id}/verify` | Verify doc (faculty) |
| `PUT` | `/documents/{id}/reject` | Reject doc (faculty) |

### Students / Faculty / Admin

Full Swagger docs at **http://localhost:8002/docs**

---

## Troubleshooting

**`ModuleNotFoundError: No module named 'sqlalchemy'`**
```bash
pip install -r backend/requirements.txt
```

**`Address already in use` on port 8002**
```bash
lsof -ti:8002 | xargs kill -9
```

**`InvalidUpdateError` in LangGraph (parallel branch merge)**
Ensure `backend/ai_engine/schemas/agent_state.py` uses `Annotated[T, _keep_last]` on all input and classification fields. This is already fixed in the current version.

**`ImportError: cannot import name 'cached_download' from 'huggingface_hub'`**
```bash
pip install "sentence-transformers>=2.7.0"
```

**Frontend stuck on a different port**
```bash
pkill -f "react-scripts"
PORT=3000 npm start
```

**Gemini quota exceeded**
The fallback to OpenRouter is automatic. Check backend logs for `llm.call.gemini.failed` followed by `llm.call.openrouter.success`.

---

## Contributing

1. Fork the repo and create a branch: `git checkout -b feature/my-feature`
2. Make changes, following existing code style
3. Test your changes
4. Commit with a clear message: `git commit -m "feat: add X"`
5. Push and open a Pull Request

### Commit convention

| Prefix | Use for |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change, no feature/fix |
| `perf:` | Performance improvement |
| `chore:` | Build / tooling |

---

## Roadmap

- [x] Multi-role JWT authentication
- [x] Document upload and verification workflow
- [x] LangGraph agentic AI assistant
- [x] RAG with ChromaDB + sentence-transformers
- [x] Gemini → OpenRouter automatic fallback
- [x] LangSmith observability tracing
- [ ] Streaming responses (SSE)
- [ ] Mobile app (React Native)
- [ ] Bulk document upload for admins
- [ ] Two-factor authentication
- [ ] Docker Compose for one-command startup
- [ ] CI/CD pipeline (GitHub Actions)

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with Python, FastAPI, React, LangGraph, and Gemini

**If you find this useful, drop a ⭐**

</div>
