# 🎓 CampusGenie — Workflows & Architecture Diagrams

> A code-accurate walkthrough of every workflow in the CampusGenie AI platform:
> the **LangGraph agent orchestrator**, the **RAG retrieval pipeline**, the
> **document ingestion pipeline** (incl. table-aware DOCX extraction), LLM
> **fallback/resilience**, memory persistence, auth, document management and
> the frontend chat experience.
>
> All diagrams are rendered from the **actual implementation** (`backend/ai_engine/**`,
> `backend/src/**`, `frontend/src/**`), not from an aspirational spec.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Workflow A — End-to-End Chat Request](#a-end-to-end-chat-request)
5. [Workflow B — LangGraph Agent Pipeline](#b-langgraph-agent-pipeline)
6. [Workflow C — Intent Classification](#c-intent-classification)
7. [Workflow D — RAG Knowledge Retrieval](#d-rag-knowledge-retrieval)
8. [Workflow E — Document Ingestion Pipeline](#e-document-ingestion-pipeline)
9. [Workflow F — Table-Aware DOCX Extraction (Timetables)](#f-table-aware-docx-extraction)
10. [Workflow G — Answer Generation](#g-answer-generation)
11. [Workflow H — LLM Call & Model Fallback](#h-llm-call--model-fallback)
12. [Workflow I — Memory Persistence](#i-memory-persistence)
13. [Workflow J — Conversation Lifecycle](#j-conversation-lifecycle)
14. [Workflow K — Document Management](#k-document-management)
15. [Workflow L — Auth & Authorization](#l-auth--authorization)
16. [Workflow M — Download / Export](#m-download--export)
17. [Parallel-Branch State Merge (the Timetable fix)](#parallel-branch-state-merge)
18. [Observability & Health](#observability--health)
19. [Configuration Reference](#configuration-reference)

---

## 1. System Overview

CampusGenie is a university management platform with an **agentic AI assistant**.
Students chat with the assistant inside a React dashboard; the backend runs a
**LangGraph state machine** that:

1. Loads conversation memory (last 6 turns)
2. Classifies the student's intent (local keyword rules **or** Gemini)
3. Fetches in **parallel** both RAG documents (ChromaDB) and live DB data (tools)
4. Generates a grounded, cited answer with confidence + follow-up questions
5. Persists both messages back to MySQL

Knowledge lives in a local **ChromaDB** vector store (currently **677 chunks**)
built from admin-uploaded PDF/DOCX/TXT/CSV/MD documents. **DOCX tables**
(timetables, fee charts, room lists) are extracted into self-describing rows so
they are actually retrievable.

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (CRA), TypeScript, Markdown rendering, voice input, context API |
| Backend API | FastAPI (`backend/src/main.py`, port `8002`) |
| AI Orchestration | LangGraph `StateGraph` (compile-per-request) |
| LLM | Google Gemini (`gemini-3.5-flash` chat / `gemini-3.1-flash-lite` fast), OpenRouter HTTP fallback |
| Embeddings | `all-MiniLM-L6-v2` (384-dim) via sentence-transformers (local, CPU) |
| Reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` (quality mode only) |
| Vector Store | ChromaDB, persistent at `backend/chroma_db/`, collection `campus_genie_docs` |
| Relational DB | MySQL (SQLAlchemy ORM) |
| Doc extraction | PyMuPDF (PDF), python-docx (DOCX incl. tables), stdlib for TXT/CSV/MD |

## 3. High-Level Architecture

```mermaid
flowchart TB
    subgraph FE["Frontend React on port 3000"]
        UI["StudentDashboard / FacultyDashboard / AdminDashboard"]
        AIW["AIAssistant chat widget"]
        API["services/api.ts - ApiClient, JWT from localStorage"]
        UI --> AIW --> API
    end

    subgraph BE["Backend FastAPI on port 8002"]
        ROUTES["src/main.py - routers"]
        AUTH["/api/auth - login, register, me - JWT"]
        AIROUTES["/api/ai/* - conversations, chat, documents, health, download"]
        DOCROUTES["/api/documents - legacy app docs"]
        OTHERROUTES["students, faculty, admin, tasks, calendar, registrar, schools, oauth"]
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

---

## A. End-to-End Chat Request

The frontend `AIAssistant` widget sends each message to the backend, which runs
the full agent pipeline and returns a *rich* `ai_message` (answer, confidence,
sources, follow-ups, download suggestions).

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

> **Failure handling:** `RateLimitExceeded` → HTTP 429, `PromptInjectionDetected`
> → HTTP 400, any other `AIEngineError` → 500 with a safe message ("AI processing
> failed"). The chatbot never hangs: LLM timeouts rotate models (see [Workflow H](#h-llm-call--model-fallback)).

---

## B. LangGraph Agent Pipeline

The graph is compiled **per request** (nodes are bound to a request-scoped DB
session via `functools.partial`) and reused by every agent run.

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

Routing logic (`graph/edges.py`):

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

**Node responsibilities:**

| Node | File | Writes to state |
|---|---|---|
| `load_memory` | `agents/memory_manager.py` | `conversation_history` (last `MEMORY_WINDOW_SIZE=6` turns) |
| `classify_intent` | `agents/intent_classifier.py` + `agents/fast_intent.py` | `intent`, `intent_confidence`, `needs_retrieval`, `needs_tool`, `suggested_tool`, `retrieval_query` |
| `retrieve_context` | `agents/retriever.py` | `retrieval_result`, `retrieved_documents` |
| `tool_call` | `agents/tool_caller.py` | `tool_result` |
| `generate_answer` | `agents/answer_generator.py` | `agent_response` |
| `save_memory` | `agents/memory_manager.py` | `memory_saved`, `_saved_user_msg`, `_saved_ai_msg` |

> **Fast mode:** `FAST_RESPONSE_MODE` (default `False`) bypasses graph
> construction and runs the same nodes linearly. When a live tool result is
> *informative* (non-empty data beyond a stub `message`), retrieval is skipped —
> live student data wins. A stub tool result (e.g. `get_timetable` →
> "Timetable feature not yet implemented") is treated as **not informative**, so
> retrieval still runs. See [Parallel-Branch State Merge](#parallel-branch-state-merge).

---

## C. Intent Classification

Two tiers — deterministic local keyword routing first, Gemini only when needed.

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
    J --> M["suggested_tool = INTENT_TOOL_MAP[intent]"]
```

- **Intent types:** `course_query`, `attendance_query`, `placement_query`,
  `notice_query`, `faculty_query`, `exam_query`, `assignment_query`,
  `policy_query`, `timetable_query`, `general_academic`, `greeting`, `unknown`.
- **Retrieval** is enabled for all factual intents (incl. `unknown`), disabled for
  `greeting`/`general_academic`.
- **Tools** are enabled for `course_query`, `attendance_query`, etc. via
  `INTENT_TOOL_MAP` (e.g. `attendance_query` → `get_student_attendance`,
  `course_query` → `get_student_courses`).
- The LLM output is parsed defensively: markdown fences stripped, trailing commas
  removed, first `{...}` object extracted, unterminated JSON closed gracefully.

---

## D. RAG Knowledge Retrieval

This is the heart of the timetable fix and the richest workflow in the system.

```mermaid
flowchart TD
    A["retrieve_context_node(state)"] --> B["Query = retrieval_query or user_message"]
    B --> C["build metadata filter: department in all/dept AND semester in 0/sem"]

    C --> D[Assemble query list]
    D --> D1["1. refined retrieval query"]
    D --> D2["2. raw user message"]
    D --> D3["3. curriculum enrichment queries"]
    D --> D4["4. schedule enrichment queries"]
    D3 --> E["_curriculum_enrichment_queries: syllabus/scheme to SEMESTER I templates"]
    D4 --> E

    E --> F["_multi_query_search: run each query on ChromaDB top_k=15, merge by chunk_id, keep best similarity score"]

    F --> G{Any candidates?}
    G -- no --> H[empty RetrievalResult + empty docs]

    G -- "yes, quality mode" --> I["rerank all candidates with cross-encoder, full ordering"]
    G -- "yes, fast mode" --> J["no rerank, similarity order used"]

    I --> K["hybrid score per candidate"]
    J --> K
    K --> K1["similarity rank component w_sim"]
    K --> K2["rerank rank component w_rer"]
    K --> K3["lexical overlap component w_lex"]
    K --> K4["+ table-row bonus for timetable rows"]

    K --> L["sort by hybrid score, take top RERANK_TOP_N=8"]

    L --> M["sibling expansion: pull chunks +/-2 around top-6 anchors"]
    M --> N["final dedupe + order to retrieved_documents (RankedDocument) + RetrievalResult"]
```

**Multi-query assembly** — the reason simple questions still find table data:

```mermaid
flowchart TD
    A[user_message + retrieval_query]
    A --> B{"schedule question? contains day/timetable keywords"}
    B -- yes --> C[timetable templates]
    C --> C1["Day: Time: Subject/Course: Faculty: Room: timetable"]
    C --> C2["Code: Course Title: Type: Credits: Faculty: Room:"]
    C --> C3["if day: Day plus day-name templates"]
    C --> C4["if subject phrase: Course Title/Faculty/Room/Day/Time template"]
    B -- no --> D[no schedule queries]
    A --> E{"curriculum question? syllabus/scheme/semester"}
    E -- yes --> F["SEMESTER I Course Code style templates"] --> Gmerge[merge all unique queries]
    D --> Gmerge
    C --> Gmerge
```

**Hybrid relevance score** (`_hybrid_score` in `retriever.py`):

```
score = 0.5 * (1 - sim_rank/total)     # similarity order
      + 0.3 * (1 - rerank_rank/total)  # cross-encoder order (0.0 in fast mode)
      + 0.2 * lexical_overlap          # best token overlap across ALL queries
      + table_row_bonus                # see below
```

**Table-row bonus (timetable fix):** when the question is a schedule question,
rows rendered from DOCX tables get a lift of `_TABLE_ROW_BONUS = 0.22` **only if**
the row looks like a labeled table row (**≥ 3 label hits** like `Day:`, `Time:`,
`Subject:`, `Room:`) **and** — when a subject phrase was detected — the row
contains **≥ 50% of the subject's tokens**. This prevents unrelated timetable
rows from crowding out the exact class the student asked about.

**Metadata filter fallback:** if the filtered search returns nothing, the search
is retried *without* the filter for a broader net.

**Sibling expansion:** the top-6 anchors bring their immediate neighbours
(±2 chunks) into the final set at a small score penalty (−0.05) — so a
"Scheme of Study" heading chunk always brings its course table along.

---

## E. Document Ingestion Pipeline

Admin uploads a document → it is extracted, cleaned, chunked, embedded and
upserted into ChromaDB, ready for retrieval.

```mermaid
flowchart LR
    SUB[Admin upload] <--> U["POST /api/ai/documents/upload - admin/registrar only"]
    U --> V["validate ext: pdf/docx/txt/csv/md, less than or equal 50 MB"]
    V --> T["save to temp file"]
    T --> E[extract_text]
    E --> CL[clean_pages]
    CL --> CH[chunk_pages]
    CH --> EM["embed chunks<br/>all-MiniLM-L6-v2, 384-dim"]
    EM --> VS[upsert_chunks to ChromaDB]
    VS --> R[Result: chunk count, doc id]

    subgraph E_["Extractor dispatch"]
        E --> P["PyMuPDF: page texts, multi-column reading order"]
        E --> Dx["python-docx: paragraphs + table-rendered rows"]
        E --> X[TXT / CSV / MD parsers]
    end

    subgraph CL_["Cleaner"]
        CL --> C1["10-step cleaning: bullets, whitespace, urls, utf fixes"]
        C1 --> C2["keeps table sentinel markers TABLE_START/TABLE_END"]
    end

    subgraph CH_["Chunker"]
        CH --> H1["table blocks to row-groups of TABLE_ROWS_PER_CHUNK=3"]
        H1 --> H2["header line repeated per group: TABLE n Columns"]
        CH --> H3["prose blocks to RecursiveCharacterTextSplitter<br/>chunk_size=768, overlap=100"]
    end
```

**Metadata stored per chunk:** `source_file`, `doc_type`, `department`,
`semester`, `academic_year`, `chunk_index`, `document_id`, `page_number`.

**Reindex path** (`backend/scripts/reindex_knowledge_base.py`):

```mermaid
flowchart TD
    A[clear collection campus_genie_docs]
    B[scan uploads/ai_documents for unique files]
    C["skip-list filter: synthetic RAG-test docs + stray reports"]
    D["infer doc_type from filename rules: timetable/attendance/policy/notice/admission/faculty/scholarship/placement/handbook"]
    E["dedupe upload suffixes _1/_2"]
    F[index each doc, 677 chunks total]
    A --> B --> C --> D --> E --> F
```

---

## F. Table-Aware DOCX Extraction

The core timetable fix: **raw DOCX tables are useless for vector search**
(`Wednesday | 09:00-10:00 | DBMS | ...` embeds poorly). The extractor rewrites
every table into **self-describing labeled rows** wrapped in sentinel markers so
the chunker can group them.

```mermaid
flowchart TD
    A["DOCX table via python-docx"] --> B["_extract_table_rows: collapse merged-cell duplicates"]
    B --> C["_looks_like_header_row: detect header via TIME regex, day names, room regex"]
    C --> D["_render_table_with_headers: pick header row as column labels"]
    D --> E["emit per-row text:<br/>Day: Wednesday, Time: 09:00-10:00,<br/>Subject: Research Methodology,<br/>Faculty: Dr. X, Room: C-302"]
    E --> F["wrap in TABLE_START_MARKER / TABLE_END_MARKER sentinel"]
    F --> G["chunker._chunk_table_block: split into 3-row groups, repeat header line per group"]
    G --> H[each row-group = one searchable, labeled chunk]
```

```mermaid
sequenceDiagram
    autonumber
    participant D as Document docx
    participant X as extractor.extract_docx
    participant C as cleaner.clean_pages
    participant K as chunker.chunk_pages
    participant E as embedder
    participant V as ChromaDB

    D->>X: python-docx open
    X->>X: paragraphs, non-table, appended as-is
    X->>X: tables to labeled rows + sentinel markers
    X-->>C: paged text with TABLE markers preserved
    C-->>K: cleaned pages, markers survive cleaning steps
    K->>K: block scan on TABLE_START_MARKER to TABLE_END_MARKER, into row-groups
    K-->>E: chunks, 3-row table groups + prose chunks
    E-->>V: embed + upsert, metadata source_file/doc_type/chunk_index
```

> **Why this fixes timetable RAG:** a row like
> `Day: Wednesday, Time: 09:00-10:00, Subject: Research Methodology, Faculty: ..., Room: ...`
> shares rich semantic and lexical overlap with "When is Research Methodology on
> Wednesday?" — the schedule enrichment queries plus the subject-gated row bonus
> push exactly that row to the top. Verified 16/16 timetable questions return the
> exact rows.

---

## G. Answer Generation

`generate_answer_node` builds the RAG prompt, calls the LLM, and parses the
strict JSON response.

```mermaid
flowchart TD
    A[generate_answer_node] --> B{intent == GREETING?}
    B -- yes --> C[canned greeting response]
    B -- no --> D[gather inputs]
    D --> D1["retrieved_documents (RankedDocument list)"]
    D --> D2["tool_result data"]
    D --> D3["conversation_history, last 6 turns"]
    D --> D4[user_context]
    D1 --> E{no docs AND no tool result?}
    D2 --> E
    E -- yes --> F["fallback: I don't have that specific information<br/>rule-12 guarded, last resort only"]
    E -- no --> G["build_rag_prompt: 12 strict rules + confidence guide + citation requirements"]
    G --> H[call_llm to structured JSON]
    H --> I["parse + repair JSON: answer, confidence, sources, follow_up_questions"]
    I --> J{confidence < 0.6?}
    J -- yes --> K[prepend low-confidence warning]
    J -- no --> L[assemble AgentResponse]
    C --> L
    K --> L
```

**RAG rules that matter (from `prompts/rag_prompt.py`):**

| # | Rule |
|---|---|
| 1 | Answer EXCLUSIVELY from retrieved context + tool results |
| 2 | If nothing relevant → exact "I don't have that specific information..." text |
| 3 | NEVER invent dates, marks, percentages, deadlines, names, phones, rooms, fees |
| 4 | ALWAYS cite exact source filenames — "According to [filename]" |
| 5 | Tool (live DB) data beats document context on conflict |
| 7–8 | No greeting, no restating the question — answer first |
| 12 | The "no information" response is the **last resort**: any partial grounding beats a refusal |

Response shape (single JSON object):

```json
{
  "answer": "…markdown answer with citations…",
  "confidence": 0.9,
  "sources": ["Master_Academic_Timetable.docx"],
  "follow_up_questions": ["…", "…", "…"]
}
```

---

## H. LLM Call & Model Fallback

Every LLM interaction goes through `llm/client.py`. Resilience chain:
**same-model retry → rotate through Gemini fallback models → OpenRouter HTTP fallback**.

```mermaid
flowchart TD
    A["call_llm(prompt, model_override, ...)"] --> B{Gemini key configured?}
    B -- no --> H[log skip, go to OpenRouter]
    B -- yes --> C["_call_gemini(prompt, primary + fallbacks)"]
    C --> D["candidates = [primary model] + [gemini-flash-latest, gemini-flash-lite-latest, gemini-3.1-flash-lite]"]
    D --> E{"per-candidate attempt:<br/>RPC timeout 60s"}
    E -- "429 / RESOURCE_EXHAUSTED" --> Rt["sleep retry_delay up to 25s, retry SAME model once"]
    Rt -- fail again --> N
    E -- "timeout / error" --> N[log + rotate to next candidate]
    N --> E2{next candidate?}
    E2 -- exhausted --> O["raise, OpenRouter attempt via openai SDK at LLM_BASE_URL"]
    E -- success --> P["LLMResult: text, provider, model, tokens, latency_ms"]
    O --> Q["LLMResult or RuntimeError if both fail"]
```

> Each free-tier Gemini model caps at ~20 requests/day. Rotation keeps the bot
> online when the day bucket is exhausted; a 429 with a short retry delay is
> retried on the same model first (per-minute cap), then rotates.

---

## I. Memory Persistence

```mermaid
sequenceDiagram
    autonumber
    participant G as LangGraph
    participant DB as MySQL

    Note over G,DB: load_memory_node, before classification
    G->>DB: SELECT last MEMORY_WINDOW_SIZE times 2 messages for conversation
    DB-->>G: conversation_history, user/ai turns
    G->>G: inject into RAG prompt as history

    Note over G,DB: save_memory_node, after generation
    G->>DB: INSERT AIMessage user, content, created_at=now
    G->>DB: flush, get user_msg.id
    G->>DB: INSERT AIMessage ai, answer, created_at=now+1ms for strict ordering
    G->>DB: UPDATE AIConversation SET updated_at
    G->>DB: commit
```

**Ordering trick:** the AI reply is stamped `now + 1ms` so `(created_at, id)`
always places the user message before the AI reply, even with second-resolution
DB clocks.

---

## J. Conversation Lifecycle

API endpoints under `/api/ai` (`ai_engine/api/ai_routes.py`):

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ai/conversations` | create conversation (auto-titled) |
| GET | `/api/ai/conversations` | list user's conversations |
| GET | `/api/ai/conversations/{id}` | conversation + messages |
| POST | `/api/ai/conversations/{id}/messages` | **send message (main chat)** |
| DELETE | `/api/ai/conversations/{id}` | delete conversation |
| POST | `/api/ai/chat` | stateless quick chat (temp conversation) |
| POST | `/api/ai/download` | export AI content |
| POST | `/api/ai/detect-download` | suggest downloadable formats |

```mermaid
flowchart TD
    A["Frontend AIAssistant mount"] --> B["loadConversations()"]
    B --> C{empty?}
    C -- yes --> D["createConversation, default title"]
    C -- no --> E["openConversation(id): GET detail + messages"]
    D --> F[user sends first message]
    E --> F
    F --> G["sendMessage: POST messages endpoint"]
    G --> H["response includes conversation_title, sidebar auto-titles from first message"]
    H --> I["side panel: delete / rename / new chat"]
```

---

## K. Document Management

Admin/registrar only (role check → 403 otherwise).

```mermaid
flowchart TD
    subgraph Upload
        P1["POST /api/ai/documents/upload"]
        P2["doc_service.upload_and_index:<br/>save temp file, validate ext/size"]
        P3["background task: index_document_from_path,<br/>full ingestion pipeline"]
        P1 --> P2 --> P3
    end

    subgraph List
        L1["GET /api/ai/documents: list indexed docs with metadata"]
        L2["GET /api/ai/documents/stats: counts"]
    end

    subgraph Delete
        D1["DELETE /api/ai/documents/{filename}"]
        D2["delete_by_source_file: remove chunks from ChromaDB"]
    end

    subgraph Reindex
        R1["python scripts/reindex_knowledge_base.py"]
        R2["clear collection, re-scan uploads dir, rebuild - 677 chunks"]
    end
```

---

## L. Auth & Authorization

```mermaid
flowchart TD
    A["Login form: email + password"] --> B["POST /api/auth/login"]
    B --> B1{"email ends with @university.edu.in?"}
    B1 -- no --> E400[400]
    B1 -- yes --> C["verify_password bcrypt, user.is_active check"]
    C --> D["create JWT access token<br/>sub=user.email, expires=ACCESS_TOKEN_EXPIRE_MINUTES"]
    D --> E["access_token, token_type bearer, user"]
    E --> F[frontend stores token in localStorage]
    F --> G["every API call: Authorization Bearer token"]
    G --> H["get_current_user dependency to user object"]
    H --> I[role-based gates]
    I --> I1["chat messages: STUDENT only"]
    I --> I2["document upload/delete: ADMIN or REGISTRAR"]
    I --> I3["dashboards: admin/faculty/registrar/student routes"]
```

Registration (`POST /api/auth/register`) hashes the password via bcrypt and stores
a `User` with a role. Frontend routing in `AppRoutes.tsx`:
`!isAuthenticated → AuthPage`, then admin → AdminDashboard, registrar →
RegistrarDashboard, staff → FacultyDashboardNew, else StudentDashboard.

---

## M. Download / Export

```mermaid
flowchart TD
    A[generate_answer produces content] --> B["DownloadService.detect_download_need(content, intent)"]
    B --> C{"timetable keywords >= 3 or timetable intent?"}
    C -- yes --> D["suggest pdf + csv + text<br/>filename timetable_YYYYMMDD_HHMMSS"]
    C -- no --> E{"table keywords >= 2?"}
    E -- yes --> F["suggest csv + text<br/>filename data_YYYYMMDD_HHMMSS"]
    E -- no --> G[no download suggestion]
    D --> H["POST /api/ai/download: generate file"]
    F --> H
    H --> I[response as downloadable attachment]
```

---

## Parallel-Branch State Merge

*(The decisive bug fix for timetable RAG.)*

`retrieve_context` and `tool_call` run in **parallel** in LangGraph. Each branch
re-emits the whole state; the branch that finishes last would carry
`retrieved_documents: None` (from the input state) for keys it didn't produce.
With default last-write-wins this **clobbered the real retrieved docs**, so
timetable questions (which need *both* retrieval and tools) reached the answer
generator with **zero documents** → "I don't have that information".

`AgentState` (`schemas/agent_state.py`) fixes this with custom reducers:

```mermaid
flowchart TD
    A["Parallel superstep: retrieve_context and tool_call"] --> B["branch A writes retrieved_documents = real docs"]
    A --> C["branch B re-emits retrieved_documents = None, didn't produce it"]
    B --> M["LangGraph merge with _keep_first_real:<br/>keep new value unless it's None, else keep old"]
    C --> M
    M --> D["answer generator now sees 16 real docs: docs_count=16, has_tool_result=true"]
```

| Reducer | Applies to | Behaviour |
|---|---|---|
| `_keep_last` | input & classification fields | last-write-wins, no conflict |
| `_keep_first_real` | `retrieved_documents`, `retrieval_result`, `tool_result` | keep the *populated* value; a stale `None` cannot clobber a real result |
| `_trace_reducer` | `execution_trace` | prefix-aware append — avoids exponential duplication from `operator.add` while preserving parallel branch entries |

---

## Observability & Health

- **Health endpoint** `GET /api/ai/health` checks embedding model (dim=384),
  ChromaDB chunk count (677), and Gemini key presence; returns 503 on degradation.
- **Startup warmup:** embedding model, ChromaDB and the reranker are loaded at
  startup via a thread pool so the first request is fast; prints
  `✅ AI Engine ready | Embedding dim: 384 | ChromaDB chunks: 677`.
- **Structured logging:** every node logs `event` entries
  (`orchestrator.run.start`, `retriever.done`, `answer.generate.start`,
  `memory.save.done`, `llm.call.gemini.rate_limited`, …) with `trace_id` and
  latencies via `Timer`.
- **LangSmith tracing:** optional — enabled when `ENABLE_LANGSMITH_TRACING` +
  `LANGSMITH_API_KEY` are set (env vars injected before any langgraph import).
- **Rate limiting:** 60/min, 20 burst, 1000/day per user (`core/security.py`).

**Diagnostic recipe without burning Gemini quota:**

```python
# 1) Standalone embedding similarity
model.encode("When is Advanced DBMS class?").tolist()
vs.collection.query(query_embeddings=..., n_results=10)

# 2) Full retrieval node
retrieve_context_node({
  "user_message": "...", "retrieval_query": "...",
  "user_context": {...}, "trace_id": "...", "needs_retrieval": True,
})
# inspect state["retrieved_documents"][i].content / .metadata.source_file / .similarity_score
```

---

## Configuration Reference

Key knobs (`backend/ai_engine/core/config.py`, overridable via `backend/.env`):

| Setting | Default | Meaning |
|---|---|---|
| `GEMINI_CHAT_MODEL` | `gemini-3.5-flash` | answer generation model |
| `GEMINI_FAST_MODEL` | `gemini-3.1-flash-lite` | intent classification / fast path |
| `GEMINI_FALLBACK_MODELS` | `gemini-flash-latest`, `gemini-flash-lite-latest`, `gemini-3.1-flash-lite` | rotation on 429/timeout |
| `GEMINI_TIMEOUT_SECONDS` | 60 | hard per-call timeout |
| `CHROMA_COLLECTION_NAME` | `campus_genie_docs` | vector collection |
| `RETRIEVAL_TOP_K` | 15 | candidates from ChromaDB |
| `RERANK_TOP_N` | 8 | docs reaching the LLM (quality mode) |
| `FAST_RETRIEVAL_TOP_K` | 3 | docs reaching the LLM (fast mode) |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | 768 / 100 | prose text splitting |
| `TABLE_ROWS_PER_CHUNK` | 3 | docx table rows per chunk |
| `MAX_CONTEXT_CHARS_PER_DOCUMENT` | 1200 | per-chunk context cap in prompt |
| `MEMORY_WINDOW_SIZE` | 6 | conversation turns loaded |
| `EMBEDDING_MODEL_NAME` | `all-MiniLM-L6-v2` | 384-dim local embeddings |
| `RERANKER_MODEL_NAME` | `cross-encoder/ms-marco-MiniLM-L-6-v2` | local reranker |
| `FAST_RESPONSE_MODE` | `False` | quality vs fast path |
| `FAST_INTENT_ROUTING` | `True` | local keyword intent routing first |
| `RATE_LIMIT_PER_MINUTE/DAY/BURST` | 60 / 1000 / 20 | user throttling |
| `ALLOWED_DOCUMENT_EXTENSIONS` | pdf, docx, txt, csv, md | uploads |

---

## Services / Ports

| Service | How to start | URL |
|---|---|---|
| Backend (FastAPI) | `cd backend && PYTHONPATH=src nohup /opt/homebrew/bin/python3.11 -m uvicorn src.main:app --host 0.0.0.0 --port 8002` | http://localhost:8002 |
| API docs (Swagger) | — | http://localhost:8002/docs |
| AI health | — | http://localhost:8002/api/ai/health |
| Frontend (React) | `cd frontend && npm start` | http://localhost:3000 |
| KB reindex | `cd backend && PYTHONPATH=.. python3.11 scripts/reindex_knowledge_base.py` | → 677 chunks |

**Demo login:** `student@university.edu.in` / `student123`

---

*Diagrams in this file reflect the committed state at `main` (`0341910`).
Generated from the live codebase — `backend/ai_engine/**`, `backend/src/**`, and
`frontend/src/**`.*
