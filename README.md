<div align="center">

# 🎓 CampusGenie — AI for Smarter Learning
             
### 🤖 Transforming Educational Administration Through Agentic AI

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-FF6B35?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-0.4-4A90D9?style=for-the-badge)](https://www.trychroma.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

[Features](#-features) • [Architecture](#-architecture) • [Workflow Diagrams](#-workflow-diagrams) • [Quick Start](#-quick-start) • [AI Engine](#-ai-engine) • [API Docs](#-api-reference) • [Contributing](#-contributing)

</div>

---

## Overview

**CampusGenie** is a full-stack university management platform built around an enterprise-grade AI assistant. Students, faculty, and registrars get a single portal to handle documents, timetables, attendance, grades, and calendars — with a conversational AI agent that answers academic queries using Retrieval-Augmented Generation (RAG) over university knowledge documents.

### Why CampusGenie?

- **Agentic AI** — a LangGraph `StateGraph`, compiled per request, orchestrates memory loading, intent classification, **parallel** RAG retrieval + live DB tool calls, and answer generation
- **Dual LLM providers** — Google Gemini as primary (`gemini-3.5-flash` for answers, `gemini-3.1-flash-lite` for fast intent/classification), with automatic rotation across Gemini fallback models and an OpenRouter HTTP fallback if Gemini is unavailable
- **Semantic search** — ChromaDB vector store (677 chunks and growing) with local `all-MiniLM-L6-v2` sentence-transformer embeddings + `cross-encoder/ms-marco-MiniLM-L-6-v2` reranking
- **Table-aware ingestion** — DOCX tables (timetables, fee charts, room lists) are rewritten into self-describing labeled rows so they're actually retrievable by semantic search, not just dumped as raw table text
- **Multi-role** — Student, Faculty, Admin, and Registrar portals with JWT + RBAC
- **Real-time-ish** — document verification status, attendance tracking, calendar events, all backed by MySQL

---

## Features

### 🤖 AI Assistant
- Conversational academic Q&A with memory (last 6 turns, `MEMORY_WINDOW_SIZE`)
- RAG over admin-uploaded knowledge documents (PDF, DOCX, TXT, CSV, MD)
- Live database tool calls — timetable, attendance, grades, deadlines, faculty lookup
- Two-tier intent classification: fast local keyword routing first, Gemini LLM classification when keywords don't match
- Automatic Gemini model rotation → OpenRouter fallback on API failures, so the chatbot never hard-fails
- Structured, cited answers with a confidence score and follow-up question suggestions
- Prompt-injection scanning and PII masking before any LLM call

### 🎓 Academic Management
- Multi-school hierarchy: School → Department → Course
- Student enrollment with auto-generated profiles
- GPA tracking and academic performance analytics
- Task and deadline management

### 📄 Document Management
- Drag-and-drop upload with file validation
- Real-time status: Pending / Verified / Rejected / Missing
- Faculty review queue with rejection reasons
- Email notifications on status changes

### 👥 User Portals

| Role | Key Capabilities |
|------|----------------|
| **Student** | Upload documents, view grades/attendance, chat with AI |
| **Faculty** | Verify documents, view student records, manage timetables |
| **Admin** | User management, course setup, document knowledge base management |
| **Registrar** | Full oversight, analytics, bulk operations |

---

## Architecture

### At a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│              React 19 + TypeScript + Tailwind               │
│                    localhost:3000                            │
└──────────────────────────┬──────────────────────────────────┘
                            │ REST API + Bearer JWT
┌──────────────────────────▼──────────────────────────────────┐
│                    FastAPI Backend                          │
│                    localhost:8002                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AI Engine (LangGraph StateGraph)         │   │
│  │                                                         │   │
│  │  START → load_memory → classify_intent                │   │
│  │               ↙              ↘                         │   │
│  │   retrieve_context      tool_call                     │   │
│  │    (ChromaDB RAG)     (Live MySQL queries)             │   │
│  │               ↘              ↙                         │   │
│  │            generate_answer                             │   │
│  │       (Gemini rotation → OpenRouter)                   │   │
│  │               ↓                                         │   │
│  │           save_memory → END                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  MySQL (users, documents, timetables, attendance, tasks)     │
│  ChromaDB (knowledge document embeddings, 677 chunks)        │
└─────────────────────────────────────────────────────────────┘
```

### Full System Diagram

```mermaid
flowchart TB
    subgraph FE["Frontend - React, port 3000"]
        UI["StudentDashboard / FacultyDashboard / AdminDashboard"]
        AIW["AIAssistant chat widget"]
        API["services/api.ts - ApiClient, JWT from localStorage"]
        UI --> AIW --> API
    end

    subgraph BE["Backend - FastAPI, port 8002"]
        ROUTES["src/main.py - routers"]
        AUTH["/api/auth - login, register, me - JWT"]
        AIROUTES["/api/ai/* - conversations, chat, documents, health, download"]
        DOCROUTES["/api/documents - legacy app docs"]
        OTHERROUTES["students, faculty, admin, tasks, calendar, registrar"]
        ROUTES --> AUTH
        ROUTES --> AIROUTES
        ROUTES --> DOCROUTES
        ROUTES --> OTHERROUTES

        subgraph AIE["ai_engine - the agentic system"]
            CS["services/chat_service.py - security gate + initial state"]
            ORCH["graph/orchestrator.py - LangGraph"]
            NODES["load_memory to classify_intent to retrieve_context/tool_call to generate_answer to save_memory"]
            CP["prompts/rag_prompt.py - RAG prompt, 12 rules"]
            LLM["llm/client.py - Gemini rotation + OpenRouter fallback"]
            CS --> ORCH --> NODES --> CP --> LLM
        end
        AIROUTES --> CS
    end

    subgraph DATA["Data stores"]
        CHROMA[("ChromaDB<br/>677 chunks")]
        KB_UPLOADS[("backend/uploads/ai_documents<br/>admin knowledge docs")]
        MYSQL[("MySQL<br/>users, conversations, messages, students, faculty, tasks")]
    end

    API -- "HTTP + Bearer JWT" --> ROUTES
    NODES -- "semantic search / upsert" --> CHROMA
    LLM -- "HTTPS - Gemini / OpenRouter" --> GEM["Google Gemini / OpenRouter"]
    NODES -- "SQLAlchemy" --> MYSQL
    KB_UPLOADS -- "reindex / upload" --> CHROMA
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 (CRA), TypeScript, Tailwind CSS, Markdown rendering, voice input |
| Backend API | FastAPI (`backend/src/main.py`, port `8002`) |
| AI Orchestration | LangGraph `StateGraph` (compile-per-request) |
| LLM (primary) | Google Gemini — `gemini-3.5-flash` (chat) / `gemini-3.1-flash-lite` (fast/intent) |
| LLM (fallback) | Gemini model rotation, then OpenRouter HTTP fallback |
| Embeddings | `all-MiniLM-L6-v2` (384-dim), sentence-transformers, local CPU |
| Reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` (quality mode only) |
| Vector Store | ChromaDB, persistent at `backend/chroma_db/`, collection `campus_genie_docs` |
| Relational DB | MySQL 8.0+ (SQLAlchemy ORM) |
| Doc extraction | PyMuPDF (PDF), python-docx (DOCX incl. tables), stdlib (TXT/CSV/MD) |
| Auth | JWT (python-jose) + bcrypt |
| Observability | Structured logging + optional LangSmith tracing |

---

## 🔄 Workflow Diagrams

### 📋 Diagram Legend

| Icon | Meaning | Icon | Meaning |
|------|---------|------|---------|
| 👤 | User/Person | 📥 | Input/Request |
| 🎨 | Frontend/UI | ✅ | Success/Complete |
| ⚡ | Backend/API | ❌ | Error/Failure |
| 🤖 | AI Engine | ⚠️ | Warning/Alert |
| 🗄️ | Database | 🔄 | Process/Flow |
| 🔍 | Search/Vector DB | 📊 | Monitoring/Metrics |
| 🔐 | Auth/Security | 🧠 | LLM/Intelligence |
| 📤 | Upload/Export | 🔢 | Embeddings/Vectors |

### AI Chat Query Processing — Quick View

```mermaid
graph LR
    Query[❓ User Query] --> LoadMemory[🧠 Load Memory<br/>Last 6 turns]
    LoadMemory --> IntentClassify[🎯 Intent Classification]

    IntentClassify -->|Academic| RAGRetrieval[🔍 RAG Retrieval]
    IntentClassify -->|Live data| DBTools[🛠️ DB Tools]
    IntentClassify -->|Greeting| AnswerGen[🤖 Answer Generation]

    RAGRetrieval --> VectorSearch[🔍 ChromaDB Search]
    VectorSearch --> Rerank[📊 Rerank Results]
    Rerank --> AnswerGen

    DBTools --> DBQueries[🗄️ Live DB Queries]
    DBQueries --> MySQL[(🗄️ MySQL)]
    MySQL --> DBQueries
    DBQueries --> AnswerGen

    AnswerGen --> Gemini[🧠 Gemini rotation]
    Gemini -->|Fallback| OpenRouter[🧠 OpenRouter]
    OpenRouter --> AnswerGen

    AnswerGen --> SaveMemory[💾 Save Memory]
    SaveMemory --> FinalAnswer[✅ Final Answer]

    style Query fill:#e1f5ff
    style LoadMemory fill:#90caf9
    style IntentClassify fill:#ffcc80
    style RAGRetrieval fill:#ce93d8
    style DBTools fill:#a5d6a7
    style AnswerGen fill:#ef9a9a
    style FinalAnswer fill:#81c784
```

> The diagram above is the friendly overview. For the exact, code-accurate breakdown of every node, edge, and reducer — including the LangGraph parallel-branch merge fix for timetable queries — see the **[detailed workflow diagrams](#detailed-workflows-a-m)** section below.

### 📋 Document Verification Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Upload: Student uploads document
    Upload --> Pending: Document created in DB
    Pending --> Verified: Faculty approves
    Pending --> Rejected: Faculty rejects
    Pending --> Missing: File not found

    Verified --> [*]: Process complete
    Rejected --> Upload: Student re-uploads
    Missing --> Upload: Student re-uploads
```

### 🎓 Multi-Role Dashboard Map

```mermaid
graph TB
    subgraph Student["Student Portal"]
        S1[Upload Documents]
        S2[View Grades and GPA]
        S3[Check Timetable]
        S4[Chat with AI Assistant]
        S5[View Tasks and Deadlines]
    end

    subgraph Faculty["Faculty Portal"]
        F1[Verify Documents]
        F2[View Student Records]
        F3[Manage Timetables]
        F4[Create and Grade Tasks]
    end

    subgraph Admin["Admin Portal"]
        A1[User Management]
        A2[Course Setup]
        A3[Knowledge Base Management]
        A4[Analytics Dashboard]
    end

    subgraph Registrar["Registrar Portal"]
        R1[Full Oversight]
        R2[Analytics and Reports]
        R3[Bulk Operations]
    end

    S4 --> AI[AI Engine]
    F1 --> DB[(MySQL)]
    A1 --> DB
    R1 --> DB
```

### Workflow Status Summary

| Workflow | Purpose | Status |
|----------|---------|--------|
| System Architecture | Overall system design | ✅ Active |
| Document Upload & Ingestion | File extraction, table-aware chunking, embedding | ✅ Active |
| AI Chat Query (LangGraph) | Conversational AI processing | ✅ Active |
| Authentication | JWT login + role-based access | ✅ Active |
| Document Verification | Faculty review process | ✅ Active |
| Multi-Role Dashboards | Student / Faculty / Admin / Registrar | ✅ Active |
| LLM Fallback Chain | Gemini rotation → OpenRouter | ✅ Active |
| Parallel-Branch State Merge | Timetable RAG + tool-call fix | ✅ Active |
| Error Handling & Retry | Validation, auth, DB, AI, network errors | ✅ Active |
| Real-time Sync (WebSocket/SSE) | Live push updates | 🚧 Planned |
| CI/CD Pipeline | Automated test/build/deploy | 🚧 Planned |
| Centralized Monitoring Dashboard | Cross-service metrics/alerts | 🚧 Planned |

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

The AI engine lives in `backend/ai_engine/` and is a fully self-contained agentic system, orchestrated with LangGraph.

### How a Chat Message Flows

1. **`load_memory`** — loads the last `MEMORY_WINDOW_SIZE` (default 6) conversation turns from MySQL
2. **`classify_intent`** — fast local keyword routing first (`FAST_INTENT_ROUTING`); falls back to a Gemini LLM call for anything the keyword table doesn't cover. Intents include `greeting`, `timetable_query`, `attendance_query`, `course_query`, `exam_query`, `policy_query`, `general_academic`, `unknown`
3. **Parallel fan-out** (chosen by classification flags):
   - `retrieve_context` — embeds the query, multi-query searches ChromaDB (top_k=15), reranks with a cross-encoder, applies a table-row relevance bonus for timetable data, then does sibling-chunk expansion
   - `tool_call` — runs a live SQL query (timetable, attendance, grades, deadlines, faculty)
4. **`generate_answer`** — LLM call with a 12-rule RAG system prompt + retrieved docs + tool result + conversation history → strict structured JSON (`answer`, `confidence`, `sources`, `follow_up_questions`)
5. **`save_memory`** — persists both turns to MySQL, with a `+1ms` timestamp trick on the AI reply to guarantee ordering

A custom set of state reducers (`_keep_last`, `_keep_first_real`, `_trace_reducer`) ensures the parallel `retrieve_context` / `tool_call` branches merge correctly — see [Parallel-Branch State Merge](#parallel-branch-state-merge) for the exact bug this fixes.

### LLM Fallback Chain

Every LLM call goes through `ai_engine/llm/client.py`:

```
call_llm(prompt)
  ├── try: gemini-3.5-flash (or fast model)         ✅ → return result
  ├── on 429/RESOURCE_EXHAUSTED: retry same model once after a short delay
  ├── on timeout/error: rotate to next Gemini candidate
  │     (gemini-flash-latest → gemini-flash-lite-latest → gemini-3.1-flash-lite)
  └── if all Gemini candidates fail:
        └── try: OpenRouter (via openai SDK, LLM_BASE_URL)   ✅ → return result
              └── except: raise RuntimeError (both providers failed)
```

Configure via `.env`:

```env
# Primary
GEMINI_API_KEY=...
GEMINI_CHAT_MODEL=gemini-3.5-flash
GEMINI_FAST_MODEL=gemini-3.1-flash-lite
GEMINI_FALLBACK_MODELS=gemini-flash-latest,gemini-flash-lite-latest,gemini-3.1-flash-lite
GEMINI_TIMEOUT_SECONDS=60

# Fallback
OPENROUTER_API_KEY=sk-or-v1-...
LLM_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_TEMPERATURE=0.3
```

### Uploading Knowledge Documents

Admins/registrars can upload documents that feed the RAG pipeline:

```
POST /api/ai/documents/upload
```

Supported formats: `.pdf`, `.docx`, `.txt`, `.csv`, `.md` (up to 50 MB). Documents are extracted, cleaned, chunked (prose: 768 chars / 100 overlap; DOCX tables: 3 rows per chunk with repeated headers), embedded locally with `all-MiniLM-L6-v2`, and upserted into ChromaDB.

---

## Detailed Workflows (A–M)

The diagrams above give the quick mental model. These are the exact, implementation-level flows — sequence diagrams and flowcharts traced from the actual code paths in `backend/ai_engine/**` and `backend/src/**`.

### A. End-to-End Chat Request

```mermaid
sequenceDiagram
    autonumber
    participant U as Student React frontend
    participant F as services/api.ts ApiClient
    participant R as FastAPI POST endpoint
    participant S as ChatService.send_message
    participant G as LangGraph run_agent
    participant L as Gemini via llm/client.py
    participant D as MySQL
    participant C as ChromaDB

    U->>F: type message + Enter, or voice input
    F->>R: POST content, Authorization Bearer JWT
    R->>R: dep get_current_user JWT, user must be STUDENT
    R->>R: verify conversation belongs to user, 404 otherwise
    R->>S: send_message(conversation_id, message, current_user)

    S->>S: rate_limiter.check_and_consume, 429 if exceeded
    S->>S: validate_and_clean_input, prompt-injection scan, 400 if flagged
    S->>S: mask_pii, masks emails/phones before LLM call
    S->>G: build initial AgentState

    G->>G: load_memory_node, last 6 turns from MySQL
    G->>G: classify_intent_node, intent + needs_retrieval + needs_tool + retrieval_query
    par Parallel superstep
        G->>C: retrieve_context, multi-query search + rerank
        G->>D: tool_call, attendance / courses / deadlines / faculty
    end
    G->>L: generate_answer, RAG prompt with context + tool results + history
    L-->>G: structured JSON answer, confidence, sources, follow_up_questions
    G->>D: save_memory_node, persist user + AI messages, bump updated_at

    S-->>R: user_msg, ai_msg, agent_response
    R->>R: auto-title conversation from first message, build rich ai_message dict
    R-->>F: user_message + ai_message with answer, confidence, sources, follow_up_questions
    F-->>U: render Markdown answer, confidence bar, cited sources, follow-up chips, download button
```

> **Failure handling:** `RateLimitExceeded` → HTTP 429, `PromptInjectionDetected` → HTTP 400, any other `AIEngineError` → 500 with a safe message.

### B. LangGraph Agent Pipeline

```mermaid
flowchart LR
    START([START])
    LM["load_memory"]
    CI["classify_intent"]
    RC["retrieve_context"]
    TC["tool_call"]
    GA["generate_answer"]
    SM["save_memory"]
    ENDN([END])

    START --> LM --> CI

    CI -- "route_after_classification" --> RC
    CI -- "route_after_classification" --> TC
    CI -- "GREETING - no retrieval, no tool" --> GA

    RC --> GA
    TC --> GA
    GA --> SM --> ENDN
```

```mermaid
flowchart TD
    A[classify_intent output] --> B{Is intent GREETING?}
    B -- yes --> GA[generate_answer only]
    B -- no --> C{needs_retrieval?}
    C -- yes --> D[add retrieve_context]
    C -- no --> E{needs_tool?}
    E -- yes --> F[add tool_call]
    D --> F
    F --> G{Any branch selected?}
    G -- no --> GA
    G -- yes --> H["run selected branches in parallel"] --> GA
```

| Node | File | Writes to state |
|---|---|---|
| `load_memory` | `agents/memory_manager.py` | `conversation_history` |
| `classify_intent` | `agents/intent_classifier.py` + `agents/fast_intent.py` | `intent`, `needs_retrieval`, `needs_tool`, `suggested_tool`, `retrieval_query` |
| `retrieve_context` | `agents/retriever.py` | `retrieval_result`, `retrieved_documents` |
| `tool_call` | `agents/tool_caller.py` | `tool_result` |
| `generate_answer` | `agents/answer_generator.py` | `agent_response` |
| `save_memory` | `agents/memory_manager.py` | `memory_saved` |

### C. Intent Classification

```mermaid
flowchart TD
    A[user_message] --> B{FAST_INTENT_ROUTING = True?}
    B -- yes --> C[fast_intent.py keyword scan]
    C --> D{Matching rules?}
    D -- "greeting regex" --> E[GREETING]
    D -- "keyword set" --> F[IntentType from keyword table]
    D -- "no match" --> G[Gemini LLM classification]
    B -- no --> G
    G --> H[build_intent_prompt, call_llm, JSON parse/repair]
    F --> I[ClassificationResult]
    E --> I
    H --> I
    I --> J{Map to flags}
    J --> K["needs_retrieval = INTENT_NEEDS_RETRIEVAL[intent]"]
    J --> L["needs_tool = INTENT_NEEDS_TOOL[intent]"]
```

### D. RAG Knowledge Retrieval

```mermaid
flowchart TD
    A["retrieve_context_node(state)"] --> B["Query = retrieval_query or user_message"]
    B --> C["build metadata filter: department in all/dept, semester in 0/sem"]
    C --> D[Assemble query list]
    D --> D1["1. refined retrieval query"]
    D --> D2["2. raw user message"]
    D --> D3["3. curriculum enrichment queries"]
    D --> D4["4. schedule enrichment queries"]
    D3 --> E["templates for syllabus/scheme questions"]
    D4 --> E
    E --> F["_multi_query_search: run each query on ChromaDB top_k=15, merge by chunk_id"]
    F --> G{Any candidates?}
    G -- no --> H[empty RetrievalResult]
    G -- "yes, quality mode" --> I[rerank with cross-encoder]
    G -- "yes, fast mode" --> J[no rerank, similarity order]
    I --> K[hybrid score per candidate]
    J --> K
    K --> K1[similarity rank component]
    K --> K2[rerank rank component]
    K --> K3[lexical overlap component]
    K --> K4[table-row bonus for timetable rows]
    K --> L["sort, take top RERANK_TOP_N=8"]
    L --> M["sibling expansion: +/-2 chunks around top-6 anchors"]
    M --> N[final dedupe to retrieved_documents]
```

**Hybrid relevance score** (`_hybrid_score` in `retriever.py`):

```
score = 0.5 * (1 - sim_rank/total)     # similarity order
      + 0.3 * (1 - rerank_rank/total)  # cross-encoder order (0.0 in fast mode)
      + 0.2 * lexical_overlap          # best token overlap across all queries
      + table_row_bonus                # see below
```

**Table-row bonus:** schedule questions get a `_TABLE_ROW_BONUS = 0.22` lift for rows with **≥ 3 label hits** (`Day:`, `Time:`, `Subject:`, `Room:`) that also contain **≥ 50% of the subject's tokens** when a subject phrase is detected — this keeps the exact class row on top instead of unrelated timetable rows.

### E. Document Ingestion Pipeline

```mermaid
flowchart LR
    SUB[Admin upload] <--> U["POST /api/ai/documents/upload"]
    U --> V["validate ext: pdf/docx/txt/csv/md, <=50 MB"]
    V --> T[save to temp file]
    T --> E[extract_text]
    E --> CL[clean_pages]
    CL --> CH[chunk_pages]
    CH --> EM["embed chunks<br/>all-MiniLM-L6-v2, 384-dim"]
    EM --> VS[upsert_chunks to ChromaDB]
    VS --> R[Result: chunk count, doc id]

    subgraph E_["Extractor dispatch"]
        E --> P[PyMuPDF: page texts]
        E --> Dx["python-docx: paragraphs + table rows"]
        E --> X[TXT / CSV / MD parsers]
    end

    subgraph CH_["Chunker"]
        CH --> H1["table blocks to row-groups of 3"]
        CH --> H3["prose blocks to RecursiveCharacterTextSplitter<br/>768 chars, 100 overlap"]
    end
```

### F. Table-Aware DOCX Extraction (the Timetable Fix)

Raw DOCX tables embed poorly for vector search. The extractor rewrites every table into **self-describing labeled rows**:

```mermaid
flowchart TD
    A["DOCX table via python-docx"] --> B[collapse merged-cell duplicates]
    B --> C[detect header row via regex/day-name patterns]
    C --> D[pick header row as column labels]
    D --> E["emit per-row text:<br/>Day: Wednesday, Time: 09:00-10:00,<br/>Subject: Research Methodology, Room: C-302"]
    E --> F[wrap in table sentinel markers]
    F --> G["chunker groups rows into 3-row chunks, repeats header"]
    G --> H[each row-group = one searchable, labeled chunk]
```

> A row like `Day: Wednesday, Time: 09:00-10:00, Subject: Research Methodology...` shares rich lexical overlap with "When is Research Methodology on Wednesday?" — verified 16/16 timetable questions return the exact rows.

### G. Answer Generation

```mermaid
flowchart TD
    A[generate_answer_node] --> B{intent == GREETING?}
    B -- yes --> C[canned greeting response]
    B -- no --> D[gather retrieved docs + tool result + history + user_context]
    D --> E{no docs AND no tool result?}
    E -- yes --> F["fallback: I don't have that information - last resort only"]
    E -- no --> G["build_rag_prompt: 12 strict rules"]
    G --> H[call_llm to structured JSON]
    H --> I[parse + repair JSON]
    I --> J{confidence < 0.6?}
    J -- yes --> K[prepend low-confidence warning]
    J -- no --> L[assemble AgentResponse]
    C --> L
    K --> L
```

**Key RAG rules:** answer exclusively from retrieved context + tool results; never invent dates/marks/names/fees; always cite source filenames; live tool data beats document context on conflict; the "no information" response is a last resort.

### H. LLM Call & Model Fallback

```mermaid
flowchart TD
    A["call_llm(prompt)"] --> B{Gemini key configured?}
    B -- no --> H[skip to OpenRouter]
    B -- yes --> C[_call_gemini with candidate list]
    C --> D["candidates = primary + fallback models"]
    D --> E["per-candidate attempt, 60s timeout"]
    E -- "429" --> Rt[retry same model once after short delay]
    Rt -- fail again --> N
    E -- "timeout/error" --> N[rotate to next candidate]
    N --> E2{next candidate?}
    E2 -- exhausted --> O[OpenRouter fallback via openai SDK]
    E -- success --> P[LLMResult]
    O --> Q[LLMResult or RuntimeError if both fail]
```

### I. Memory Persistence

```mermaid
sequenceDiagram
    autonumber
    participant G as LangGraph
    participant DB as MySQL

    Note over G,DB: load_memory_node, before classification
    G->>DB: SELECT last 12 messages for conversation
    DB-->>G: conversation_history
    G->>G: inject into RAG prompt as history

    Note over G,DB: save_memory_node, after generation
    G->>DB: INSERT AIMessage user, created_at=now
    G->>DB: flush, get user_msg.id
    G->>DB: INSERT AIMessage ai, created_at=now+1ms
    G->>DB: UPDATE AIConversation SET updated_at
    G->>DB: commit
```

### Parallel-Branch State Merge — the Timetable Fix

`retrieve_context` and `tool_call` run **in parallel**. Each branch re-emits the whole state; without a custom reducer, the branch that finished last would overwrite `retrieved_documents` with `None` — silently zeroing out real RAG results for any query that needed both retrieval and a tool call (exactly what timetable questions need).

```mermaid
flowchart TD
    A["Parallel superstep: retrieve_context and tool_call"] --> B[branch A writes retrieved_documents = real docs]
    A --> C[branch B re-emits retrieved_documents = None]
    B --> M["merge with _keep_first_real:<br/>keep the populated value, never let None win"]
    C --> M
    M --> D[answer generator now sees the real docs]
```

| Reducer | Applies to | Behaviour |
|---|---|---|
| `_keep_last` | input & classification fields | last-write-wins, no conflict |
| `_keep_first_real` | `retrieved_documents`, `retrieval_result`, `tool_result` | keeps the populated value; a stale `None` can't clobber a real result |
| `_trace_reducer` | `execution_trace` | prefix-aware append, avoids duplicate parallel-branch log entries |

### L. Auth & Authorization

```mermaid
flowchart TD
    A[Login: email + password] --> B["POST /api/auth/login"]
    B --> B1{email ends with @university.edu.in?}
    B1 -- no --> E400[400]
    B1 -- yes --> C[verify_password bcrypt, is_active check]
    C --> D[create JWT access token]
    D --> E[access_token + user]
    E --> F[frontend stores token in localStorage]
    F --> G[every API call sends Authorization Bearer token]
    G --> H[get_current_user dependency]
    H --> I[role-based gates]
    I --> I1[chat messages: STUDENT only]
    I --> I2[document upload/delete: ADMIN or REGISTRAR]
```

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
│   │   │   ├── fast_intent.py
│   │   │   ├── memory_manager.py
│   │   │   ├── retriever.py
│   │   │   └── tool_caller.py
│   │   ├── api/                    # AI FastAPI routers
│   │   ├── core/                   # Config, logging, exceptions, security
│   │   ├── document_pipeline/      # Extraction, cleaning, chunking, indexing
│   │   ├── embeddings/             # Embedding + reranker models
│   │   ├── graph/                  # LangGraph orchestrator + edges
│   │   ├── llm/                    # LLM client with fallback
│   │   │   └── client.py           # Gemini rotation → OpenRouter fallback
│   │   ├── prompts/                # System, RAG, intent prompts
│   │   ├── repositories/           # Conversation DB repo
│   │   ├── schemas/                # AgentState, reducers, response types
│   │   ├── services/               # ChatService, DocumentService
│   │   └── vectorstore/            # ChromaDB client + collections
│   ├── chroma_db/                  # ChromaDB data (git-ignored)
│   ├── uploads/ai_documents/       # Uploaded knowledge docs (git-ignored)
│   ├── scripts/reindex_knowledge_base.py
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
GEMINI_CHAT_MODEL=gemini-3.5-flash
GEMINI_FAST_MODEL=gemini-3.1-flash-lite
GEMINI_FALLBACK_MODELS=gemini-flash-latest,gemini-flash-lite-latest,gemini-3.1-flash-lite
GEMINI_TIMEOUT_SECONDS=60

# OpenRouter (fallback LLM)
OPENROUTER_API_KEY=sk-or-v1-...
LLM_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_TEMPERATURE=0.3

# Retrieval / ingestion knobs
RETRIEVAL_TOP_K=15
RERANK_TOP_N=8
FAST_RETRIEVAL_TOP_K=3
CHUNK_SIZE=768
CHUNK_OVERLAP=100
TABLE_ROWS_PER_CHUNK=3
MEMORY_WINDOW_SIZE=6
FAST_RESPONSE_MODE=False
FAST_INTENT_ROUTING=True

# Rate limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST=20
RATE_LIMIT_PER_DAY=1000

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
| `GET` | `/api/ai/conversations/{id}` | Conversation + messages |
| `POST` | `/api/ai/conversations/{id}/messages` | **Send message (main chat)** |
| `DELETE` | `/api/ai/conversations/{id}` | Delete conversation |
| `POST` | `/api/ai/chat` | Stateless quick chat |
| `POST` | `/api/ai/download` | Export AI content |
| `POST` | `/api/ai/detect-download` | Suggest downloadable formats |
| `GET` | `/api/ai/health` | AI engine health check |
| `POST` | `/api/ai/documents/upload` | Upload knowledge doc (admin/registrar) |
| `GET` | `/api/ai/documents` | List indexed knowledge docs |
| `DELETE` | `/api/ai/documents/{filename}` | Delete a knowledge doc |

### Documents (Student-facing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/documents/my-documents-status` | Student doc status |
| `POST` | `/documents/upload` | Upload document |
| `PUT` | `/documents/{id}/verify` | Verify doc (faculty) |
| `PUT` | `/documents/{id}/reject` | Reject doc (faculty) |

Full interactive docs at **http://localhost:8002/docs**

---

## Observability & Health

- **Health endpoint** `GET /api/ai/health` checks embedding model dimension (384), ChromaDB chunk count, and Gemini key presence; returns 503 on degradation
- **Startup warmup:** embedding model, ChromaDB, and reranker load via a thread pool at startup so the first request is fast
- **Structured logging:** every node logs typed events (`orchestrator.run.start`, `retriever.done`, `llm.call.gemini.rate_limited`, …) with `trace_id` and latency
- **LangSmith tracing:** optional, enabled via `ENABLE_LANGSMITH_TRACING` + `LANGSMITH_API_KEY`
- **Rate limiting:** 60/min, 20 burst, 1000/day per user

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
Ensure `backend/ai_engine/schemas/agent_state.py` uses `Annotated[T, _keep_first_real]` on `retrieved_documents`, `retrieval_result`, and `tool_result`. This is already fixed in the current version — see [Parallel-Branch State Merge](#parallel-branch-state-merge).

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
Rotation and fallback are automatic. Check backend logs for `llm.call.gemini.rate_limited` / `llm.call.gemini.failed` followed by `llm.call.openrouter.success`. Each free-tier Gemini model caps at roughly 20 requests/day.

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
- [x] LangGraph agentic AI assistant with parallel RAG + tool calling
- [x] Table-aware DOCX extraction for timetable RAG
- [x] RAG with ChromaDB + sentence-transformers + cross-encoder reranking
- [x] Gemini model rotation → OpenRouter automatic fallback
- [x] Structured logging with trace IDs, optional LangSmith tracing
- [ ] Streaming responses (SSE)
- [ ] Mobile app (React Native)
- [ ] Bulk document upload for admins
- [ ] Two-factor authentication
- [ ] Docker Compose for one-command startup
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Real-time push updates (WebSocket/SSE)

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with Python, FastAPI, React, LangGraph, and Gemini

**If you find this useful, drop a ⭐**

</div>
