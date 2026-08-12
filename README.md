<div align="center">

# 🎓 CampusGenie — AI for Smarter Learning with ERP Services

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

## 🔄 Workflow Diagrams

### 📋 Diagram Legend

| Icon | Meaning |
|------|---------|
| 👤 | User/Person |
| 🎨 | Frontend/UI |
| ⚡ | Backend/API |
| 🤖 | AI Engine |
| 🗄️ | Database |
| 🔍 | Search/Vector DB |
| 🔐 | Authentication/Security |
| 📤 | Upload/Export |
| 📥 | Input/Request |
| ✅ | Success/Complete |
| ❌ | Error/Failure |
| ⚠️ | Warning/Alert |
| 🔄 | Process/Flow |
| 📊 | Monitoring/Metrics |
| 🚀 | Deployment |
| 🧠 | LLM/Intelligence |
| 🔢 | Embeddings/Vectors |
| 📝 | Logging/Documentation |
| 🔨 | Build/Compile |
| 🧪 | Testing |
| 📧 | Notification/Email |
| 💾 | Storage/Cache |
| 🌐 | Network/Web |
| 🛡️ | Security/Protection |

### 🌐 Overall System Architecture Flow

```mermaid
graph TB
    User[👤 User] -->|Authentication| Auth[🔐 JWT Auth Service]
    Auth --> Frontend[🎨 React Frontend<br/>localhost:3000]
    Frontend -->|REST API| Backend[⚡ FastAPI Backend<br/>localhost:8002]
    
    Backend --> AI_Engine[🤖 AI Engine<br/>LangGraph]
    Backend --> MySQL[(🗄️ MySQL Database)]
    Backend --> ChromaDB[(🔍 ChromaDB<br/>Vector Store)]
    
    AI_Engine --> LLM1[🧠 Gemini 2.5 Flash]
    AI_Engine --> LLM2[🧠 OpenRouter Fallback]
    AI_Engine --> ChromaDB
    AI_Engine --> MySQL
    
    subgraph "Document Processing Pipeline"
        Frontend -->|Upload| Backend
        Backend --> Extractor[📄 Text Extractor]
        Extractor --> Cleaner[🧹 Text Cleaner]
        Cleaner --> Chunker[✂️ Text Chunker]
        Chunker --> Embeddings[🔢 Embedding Generator]
        Embeddings --> ChromaDB
    end
    
    subgraph "AI Query Processing"
        Frontend -->|Chat Query| Backend
        Backend --> AI_Engine
        AI_Engine -->|Intent Classification| LLM1
        AI_Engine -->|RAG Retrieval| ChromaDB
        AI_Engine -->|DB Tools| MySQL
        AI_Engine -->|Answer Generation| LLM1
        LLM1 -->|Fallback| LLM2
    end
    
    style User fill:#e1f5ff
    style Frontend fill:#90caf9
    style Backend fill:#81c784
    style AI_Engine fill:#ffcc80
    style MySQL fill:#a5d6a7
    style ChromaDB fill:#ce93d8
    style LLM1 fill:#ef9a9a
    style LLM2 fill:#f48fb1
```

### 📤 Document Upload & Indexing Workflow

```mermaid
sequenceDiagram
    participant User as 👤 Admin/Faculty
    participant Frontend as 🎨 Frontend
    participant Backend as ⚡ Backend API
    participant Database as 🗄️ MySQL
    participant AI as 🤖 AI Engine
    participant VectorDB as 🔍 ChromaDB
    
    User->>Frontend: Upload Document
    Frontend->>Backend: POST /documents/upload
    Backend->>Backend: Validate permissions & file
    Backend->>Database: Create document record
    Database-->>Backend: Document ID generated
    Backend->>Backend: Save file to filesystem
    Backend-->>Frontend: Upload success
    
    Backend->>AI: Trigger document indexing
    AI->>AI: Text Extraction (PDF/DOCX)
    AI->>AI: Text Cleaning
    AI->>AI: Text Chunking
    AI->>AI: Generate Embeddings
    AI->>VectorDB: Store vectors in ChromaDB
    VectorDB-->>AI: Indexing complete
    AI-->>Backend: Document ready for AI queries
    Backend-->>User: Document indexed notification
```

### 💬 AI Chat Query Processing Flow

```mermaid
graph LR
    Query[❓ User Query] --> LoadMemory[🧠 Load Memory<br/>Last 6 turns]
    LoadMemory --> IntentClassify[🎯 Intent Classification<br/>Gemini LLM]
    
    IntentClassify -->|Academic| RAGRetrieval[🔍 RAG Retrieval]
    IntentClassify -->|Data| DBTools[🛠️ DB Tools]
    IntentClassify -->|General| AnswerGen[🤖 Answer Generation]
    
    RAGRetrieval --> VectorSearch[🔍 ChromaDB Search]
    VectorSearch --> Rerank[📊 Rerank Results]
    Rerank --> AnswerGen
    
    DBTools --> DBQueries[🗄️ Live DB Queries]
    DBQueries --> MySQL[(🗄️ MySQL)]
    MySQL --> DBQueries
    DBQueries --> AnswerGen
    
    AnswerGen --> Gemini[🧠 Gemini 2.5 Flash]
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

### 🔐 Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Frontend as 🎨 Frontend
    participant Backend as ⚡ Backend
    participant JWTService as 🔐 JWT Service
    participant Database as 🗄️ MySQL
    
    User->>Frontend: Login (email/password)
    Frontend->>Backend: POST /auth/login
    Backend->>Database: Verify credentials
    Database-->>Backend: User data
    Backend->>JWTService: Generate JWT token
    JWTService-->>Backend: Access token
    Backend-->>Frontend: Token + user info
    Frontend->>Frontend: Store token
    
    Note over Frontend,Backend: Subsequent requests
    
    Frontend->>Backend: API Request + JWT header
    Backend->>JWTService: Validate token
    JWTService-->>Backend: User ID & role
    Backend->>Database: Get user permissions
    Database-->>Backend: Role-based access
    Backend-->>Frontend: Processed response
```

### 📋 Document Verification Workflow

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
    
    Verified: ✅ Document verified
    Rejected: ❌ Verification failed
    Missing: ⚠️ File missing
    Pending: ⏳ Awaiting review
```

### 🎓 Multi-Role Dashboard Workflow

```mermaid
graph TB
    subgraph "👨‍🎓 Student Portal"
        S1[📤 Upload Documents]
        S2[📊 View Grades & GPA]
        S3[📅 Check Timetable]
        S4[🤖 Chat with AI Assistant]
        S5[📋 View Tasks & Deadlines]
    end
    
    subgraph "👨‍🏫 Faculty Portal"
        F1[✅ Verify Documents]
        F2[📊 View Student Records]
        F3[📅 Manage Timetables]
        F4[📝 Create & Grade Tasks]
        F5[📈 Track Attendance]
    end
    
    subgraph "👨‍💼 Admin Portal"
        A1[👥 User Management]
        A2[🏫 Course Setup]
        A3[🔧 System Configuration]
        A4[📊 Analytics Dashboard]
        A5[📚 Document Types Setup]
    end
    
    subgraph "👨‍⚖️ Registrar Portal"
        R1[📊 Full Oversight]
        R2[📈 Analytics & Reports]
        R3[🔧 Bulk Operations]
        R4[👥 All User Management]
        R5[🏫 Academic Oversight]
    end
    
    S4 --> AI[🤖 AI Engine]
    F1 --> DB[(🗄️ MySQL)]
    A1 --> DB
    R1 --> DB
    
    style S1 fill:#e1f5ff
    style F1 fill:#fff9c4
    style A1 fill:#f3e5f5
    style R1 fill:#e8f5e9
```

### 🔄 Real-time Data Synchronization

```mermaid
graph LR
    subgraph "📱 Frontend Real-time Updates"
        WebSocket[🔌 WebSocket Connection]
        SSE[📡 Server-Sent Events]
        Polling[🔄 Polling Fallback]
    end
    
    subgraph "⚡ Backend Event System"
        EventDispatcher[🎯 Event Dispatcher]
        NotificationService[📧 Notification Service]
        RedisCache[💾 Redis Cache]
    end
    
    subgraph "🗄️ Database Triggers"
        DBChangeEvents[📊 DB Change Events]
        DataUpdates[🔄 Data Updates]
    end
    
    DataUpdates --> DBChangeEvents
    DBChangeEvents --> EventDispatcher
    EventDispatcher --> NotificationService
    EventDispatcher --> RedisCache
    EventDispatcher --> WebSocket
    EventDispatcher --> SSE
    EventDispatcher --> Polling
    
    WebSocket --> ReactComponents[🎨 React Components]
    SSE --> ReactComponents
    Polling --> ReactComponents
    
    style ReactComponents fill:#90caf9
    style EventDispatcher fill:#ffcc80
    style DBChangeEvents fill:#a5d6a7
```

### 📊 System Monitoring & Logging Flow

```mermaid
graph TB
    subgraph "📊 Monitoring Components"
        AppLogs[📝 Application Logs]
        PerfMetrics[📈 Performance Metrics]
        DistTraces[🔍 Distributed Tracing]
        ErrorTracking[⚠️ Error Tracking]
    end
    
    subgraph "🤖 AI Engine Monitoring"
        LangSmithTracing[🔬 LangSmith Tracing]
        LLMApiCalls[📊 LLM API Calls]
        RAGPerformance[🔍 RAG Performance]
        EmbeddingStats[🔢 Embedding Stats]
    end
    
    subgraph "🗄️ Database Monitoring"
        DBQueryPerf[📊 Query Performance]
        DBConnectionPool[🔗 Connection Pool]
        DBIndexHealth[📈 Index Health]
    end
    
    AppLogs --> CentralLogging[🎯 Central Logging]
    PerfMetrics --> CentralLogging
    DistTraces --> CentralLogging
    ErrorTracking --> CentralLogging
    
    LangSmithTracing --> AIDashboard[🤖 AI Dashboard]
    LLMApiCalls --> AIDashboard
    RAGPerformance --> AIDashboard
    EmbeddingStats --> AIDashboard
    
    DBQueryPerf --> DBDashboard[🗄️ DB Dashboard]
    DBConnectionPool --> DBDashboard
    DBIndexHealth --> DBDashboard
    
    CentralLogging --> AlertSystem[🚨 Alert System]
    AIDashboard --> AlertSystem
    DBDashboard --> AlertSystem
    
    style CentralLogging fill:#ffcc80
    style AIDashboard fill:#ce93d8
    style DBDashboard fill:#a5d6a7
    style AlertSystem fill:#ef9a9a
```

### 🚀 Deployment & CI/CD Workflow

```mermaid
graph TB
    Developer[💻 Developer] --> GitPush[📤 Git Push]
    GitPush --> CIPipeline[🔄 CI Pipeline]
    
    CIPipeline --> RunTests[🧪 Run Tests]
    RunTests --> CodeLinting[🔍 Code Linting]
    CodeLinting --> Build[🔨 Build]
    Build --> SecurityScan[🔒 Security Scan]
    
    SecurityScan -->|Pass| CDPipeline[🚀 CD Pipeline]
    SecurityScan -->|Fail| NotifyDev[📧 Notify Developer]
    
    CDPipeline --> StagingDeploy[🧪 Staging Deploy]
    StagingDeploy --> E2ETests[🔬 E2E Tests]
    E2ETests -->|Pass| ProductionDeploy[🌐 Production Deploy]
    E2ETests -->|Fail| Rollback[🔄 Rollback]
    
    ProductionDeploy --> Monitor[📊 Monitor]
    Monitor --> AlertSystem[🚨 Alert System]
    AlertSystem --> AutoScale[📈 Auto Scale]
    
    Rollback --> NotifyDev
    NotifyDev --> Developer
    
    style CIPipeline fill:#90caf9
    style CDPipeline fill:#ffcc80
    style ProductionDeploy fill:#a5d6a7
    style StagingDeploy fill:#fff9c4
    style AlertSystem fill:#ef9a9a
```

### 🔄 Error Handling & Recovery Flow

```mermaid
graph TB
    IncomingRequest[📥 Incoming Request] --> TryExecution[🎯 Try Execution]
    
    TryExecution -->|Success| SuccessResponse[✅ Success Response]
    TryExecution -->|Error| ErrorDetected[❌ Error Detected]
    
    ErrorDetected --> ErrorTypeClassification[🔍 Error Type Classification]
    
    ErrorTypeClassification -->|Validation| ValidationError[📝 Validation Error]
    ErrorTypeClassification -->|Auth| AuthError[🔐 Auth Error]
    ErrorTypeClassification -->|Database| DatabaseError[🗄️ Database Error]
    ErrorTypeClassification -->|AI| AIError[🤖 AI Error]
    ErrorTypeClassification -->|Network| NetworkError[🌐 Network Error]
    
    ValidationError --> LogError[📝 Log Error]
    AuthError --> LogError
    DatabaseError --> LogError
    AIError --> LogError
    NetworkError --> LogError
    
    LogError --> RetryLogic[🔄 Retry Logic]
    LogError --> FallbackStrategy[🔄 Fallback Strategy]
    LogError --> NotifyUser[📧 Notify User]
    
    DatabaseError --> RetryLogic
    NetworkError --> RetryLogic
    AIError --> FallbackStrategy
    
    RetryLogic -->|Success| SuccessResponse
    RetryLogic -->|Failed| FallbackStrategy
    
    FallbackStrategy -->|Success| SuccessResponse
    FallbackStrategy -->|Failed| GracefulDegradation[🛡️ Graceful Degradation]
    
    GracefulDegradation --> NotifyUser
    NotifyUser --> ErrorResponse[❓ Error Response]
    
    style IncomingRequest fill:#e1f5ff
    style SuccessResponse fill:#a5d6a7
    style ErrorDetected fill:#ef9a9a
    style GracefulDegradation fill:#fff9c4
```

### 📚 Data Flow & State Management

```mermaid
graph LR
    subgraph "🎨 Frontend State"
        ReduxStore[🔄 Redux Store]
        ReactContext[🎯 React Context]
        LocalState[💾 Local State]
    end
    
    subgraph "⚡ Backend State"
        RedisCache[💾 Redis Cache]
        SessionStore[🔐 Session Store]
        TaskQueue[📬 Task Queue]
    end
    
    subgraph "🗄️ Database State"
        MySQLDB[(🗄️ MySQL)]
        ChromaDB[(🔍 ChromaDB)]
    end
    
    UserActions[👤 User Actions] --> ReduxStore
    UserActions --> ReactContext
    UserActions --> LocalState
    
    ReduxStore --> APICalls[📡 API Calls]
    ReactContext --> APICalls
    LocalState --> APICalls
    
    APICalls --> RedisCache
    APICalls --> SessionStore
    APICalls --> TaskQueue
    
    RedisCache --> MySQLDB
    SessionStore --> MySQLDB
    TaskQueue --> MySQLDB
    
    APICalls --> ChromaDB
    
    MySQLDB --> APICalls
    ChromaDB --> APICalls
    
    APICalls --> ReduxStore
    APICalls --> ReactContext
    APICalls --> LocalState
    
    style ReduxStore fill:#90caf9
    style RedisCache fill:#ffcc80
    style MySQLDB fill:#a5d6a7
    style ChromaDB fill:#ce93d8
```

### 📊 Workflow Summary Table

| Workflow | Purpose | Key Components | Status |
|----------|---------|----------------|--------|
| **System Architecture** | Overall system design | Frontend, Backend, AI Engine, Databases | ✅ Active |
| **Document Upload** | File processing & indexing | Extractor, Cleaner, Chunker, Embeddings | ✅ Active |
| **AI Chat Query** | Conversational AI processing | Intent classification, RAG, DB tools | ✅ Active |
| **Authentication** | User login & authorization | JWT, Role-based access | ✅ Active |
| **Document Verification** | Faculty review process | Status management, Notifications | ✅ Active |
| **Multi-Role Dashboard** | Role-specific interfaces | Student, Faculty, Admin, Registrar portals | ✅ Active |
| **Real-time Sync** | Live data updates | WebSocket, SSE, Event system | 🚧 Planned |
| **Monitoring** | System health tracking | Logs, Metrics, Traces, Alerts | 🚧 Planned |
| **CI/CD** | Deployment automation | Testing, Building, Security scanning | 🚧 Planned |
| **Error Handling** | Fault tolerance | Retry logic, Fallback strategies | ✅ Active |
| **State Management** | Data flow coordination | Redux, Context, Cache, Database | ✅ Active |

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
