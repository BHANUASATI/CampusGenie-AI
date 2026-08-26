# CampusGenie AI System Flows Analysis

## 📊 Document Upload Flow (Admin/Faculty → AI Knowledge Base)

### 🔄 Document Upload Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     1. DOCUMENT UPLOAD                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: Document Upload Form                                 │
│  - Admin/Faculty selects PDF/doc file                           │
│  - Specifies document type (syllabus, rules, handbook, etc.)   │
│  - POST /documents/upload                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend: document_routes.py /upload endpoint                   │
│  1. Validate user permissions (admin/faculty only)              │
│  2. Validate file type (PDF, DOC, DOCX, etc.)                  │
│  3. Validate file size (max limits)                              │
│  4. Generate unique filename                                   │
│  5. Save to: uploads/documents/{enrollment_number}/              │
│  6. Create database record in student_documents table            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Database: student_documents Table                              │
│  - file_name: "syllabus_cs2024.pdf"                            │
│  - file_path: "/uploads/documents/2024CS001/syllabus_cs2024.pdf"│
│  - document_type_id: references document_types table            │
│  - verification_status: "pending"                              │
│  - uploaded_at: timestamp                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI Engine: Document Indexing Pipeline                         │
│  Location: ai_engine/document_pipeline/indexer.py              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 1: Text Extraction (extractor.py)                   │   │
│  │ - Extract text from PDF using PyPDF2                      │   │
│  │ - Extract text from DOC/DOCX using python-docx            │   │
│  │ - Returns: List of pages with text content               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 2: Text Cleaning (cleaner.py)                      │   │
│  │ - Remove headers/footers                                 │   │
│  │ - Remove page numbers                                     │   │
│  │ - Normalize whitespace                                    │   │
│  │ - Remove special characters                               │   │
│  │ - Returns: Cleaned text pages                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 3: Text Chunking (chunker.py)                      │   │
│  │ - Split text into semantic chunks                        │   │
│  │ - Chunk size: ~500-1000 characters                        │   │
│  │ - Overlap: 100-200 characters between chunks              │   │
│  │ - Metadata: source_file, doc_type, department, semester   │   │
│  │ - Returns: List of text chunks with metadata            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 4: Embedding Generation (embeddings/model.py)       │   │
│  │ - Model: all-MiniLM-L6-v2 (384 dimensions)              │   │
│  │ - Convert each text chunk to vector embedding             │   │
│  │ - Returns: List of 384-dimensional vectors               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 5: Vector Database Storage (vectorstore/manager.py) │   │
│  │ - Database: ChromaDB                                     │   │
│  │ - Collection: campus_genie_docs                         │   │
│  │ - Store: (chunk_id, embedding, metadata)                 │   │
│  │ - Index: HNSW (Hierarchical Navigable Small World)      │   │
│  │ - Returns: Number of chunks indexed                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Final State: Document Ready for AI Queries                    │
│  - File stored in filesystem                                 │
│  - Metadata in MySQL database                                 │
│  - Chunks indexed in ChromaDB vector database                 │
│  - Ready for semantic search and retrieval                    │
└─────────────────────────────────────────────────────────────────┘
```

### 🗄️ Database Schema for Documents

```sql
-- Document Types (categories)
CREATE TABLE document_types (
    id INT PRIMARY KEY,
    name VARCHAR(100),           -- "Syllabus", "Handbook", "Rules"
    description TEXT,
    is_required BOOLEAN,
    max_file_size_mb DECIMAL,
    allowed_extensions VARCHAR(255) -- ["pdf", "doc", "docx"]
);

-- Student Documents (uploaded files)
CREATE TABLE student_documents (
    id INT PRIMARY KEY,
    student_id INT,
    document_type_id INT,
    file_name VARCHAR(255),        -- "syllabus_cs2024.pdf"
    file_path VARCHAR(500),        -- "/uploads/documents/..."
    file_size_mb DECIMAL,
    file_extension VARCHAR(10),
    verification_status ENUM('pending', 'approved', 'rejected'),
    uploaded_at TIMESTAMP
);
```

### 📊 Vector Database Structure (ChromaDB)

```json
{
  "collection": "campus_genie_docs",
  "chunks": [
    {
      "id": "chunk_123",
      "text": "Computer Science syllabus includes...",
      "embedding": [0.1, -0.2, 0.3, ...],  // 384 dimensions
      "metadata": {
        "source_file": "syllabus_cs2024.pdf",
        "doc_type": "syllabus",
        "department": "Computer Science",
        "semester": 3,
        "academic_year": "2024-25",
        "document_id": "uuid-123",
        "upload_date": "2024-08-09"
      }
    }
  ]
}
```

---

## 🤖 AI Chatbot Query Flow (User Question → AI Response)

### 🔄 Chatbot Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  1. USER ASKS QUESTION                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: AI Assistant Component                               │
│  - User types: "What is the minimum attendance required?"       │
│  - POST /api/ai/conversations/{id}/messages                    │
│  - Headers: Authorization: Bearer {token}                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend: AI Routes (ai_engine/api/ai_routes.py)               │
│  1. Verify JWT token and user permissions                      │
│  2. Check user is a student (role validation)                  │
│  3. Verify conversation belongs to user                         │
│  4. Call ChatService.send_message()                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ChatService: Security Gate (chat_service.py)                  │
│  Location: ai_engine/services/chat_service.py                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 1: Rate Limiting                                     │   │
│  │ - Check: User not exceeding rate limits                   │   │
│  │ - Limit: 10 requests per minute per user                  │   │
│  │ - Action: Block if exceeded (429 error)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 2: Input Validation & Cleaning                      │   │
│  │ - Remove special characters                               │   │
│  │ - Trim whitespace                                         │   │
│  │ - Validate length limits                                  │   │
│  │ - Returns: Cleaned message                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 3: PII Masking (Privacy)                            │   │
│  │ - Detect: Email addresses, phone numbers, SSN           │   │
│  │ - Mask: Replace with [EMAIL], [PHONE], [SSN]            │   │
│  │ - Log: Warning if PII found                              │   │
│  │ - Returns: Masked message for processing                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step 4: Build User Context                               │   │
│  │ - Extract: User ID, role, name                           │   │
│  │ - Enrich: Student profile (department, semester, etc.)    │   │
│  │ - Build: UserContext dict for personalization            │   │
│  │ - Returns: User context object                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  LangGraph Orchestrator (graph/orchestrator.py)              │
│  Location: ai_engine/graph/orchestrator.py                    │
│  Executes: State graph with multiple nodes                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Node 1: Load History                                     │   │
│  │ - Load: Previous messages from conversation              │   │
│  │ - Context: Last 5-10 messages for continuity            │   │
│  │ - State: conversation_history = [msg1, msg2, ...]        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Node 2: Intent Classification                           │   │
│  │ - Analyze: User message intent                           │   │
│  │ - Categories: academic, administrative, personal, etc.  │   │
│  │ - Model: LLM classification prompt                       │   │
│  │ - State: intent = "academic", confidence = 0.85         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Node 3: Retrieval Decision                               │   │
│  │ - Decide: Does this need document search?               │   │
│  │ - Logic: Based on intent and user context               │   │
│  │ - State: needs_retrieval = true/false                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Node 4: Query Transformation (if retrieval needed)      │   │
│  │ - Optimize: User query for vector search                │   │
│  │ - Expand: Add relevant terms based on context           │   │
│  │ - Filter: Apply department/semester filters              │   │
│  │ - State: retrieval_query = "minimum attendance rules"   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Node 5: Vector Search (ChromaDB)                        │   │
│  │ - Convert: Query to embedding (same model as docs)      │   │
│  │ - Search: Find similar chunks in ChromaDB                │   │
│  │ - Method: Cosine similarity                              │
│  │ - Top-k: Return 5-10 most relevant chunks                │   │
│  │ - Filter: By department, semester, doc_type              │   │
│  │ - State: retrieved_documents = [chunk1, chunk2, ...]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Node 6: Reranking (Optional)                             │   │
│  │ - Model: cross-encoder/ms-marco-MiniLM-L-6-v2          │   │
│  │ - Purpose: Re-rank retrieved chunks for relevance       │   │
│  │ - Input: Query + retrieved chunks                        │   │
│  │ - Output: Reordered chunks by relevance score           │   │
│  │ - State: retrieved_documents = reranked chunks          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Node 7: Answer Generation                               │   │
│  │ - Model: Gemini 2.5 Flash (or configured LLM)           │   │
│  │ - Input: User query + retrieved chunks + context        │   │
│  │ - Prompt: RAG prompt with system instructions           │   │
│  │ - Output: Generated answer text                          │   │
│  │ - State: agent_response = {answer, confidence, sources} │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Node 8: Follow-up Questions                             │   │
│  │ - Generate: 3-5 relevant follow-up questions            │   │
│  │ - Purpose: Help user continue conversation              │   │
│  │ - State: follow_up_questions = [...                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Node 9: Save Memory                                     │   │
│  │ - Persist: User message to DB                           │
│  │ - Persist: AI response to DB                            │
│  │ - Update: Conversation metadata                          │   │
│  │ - Table: ai_messages (conversation_id, content, etc.)   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Response Formatting & Return                                 │
│  - Format: AgentResponse object                              │
│  - Structure: {                                              │
│      answer: "The minimum attendance required is 75%",       │
│      confidence: 0.92,                                       │
│      sources: [                                             │
│        {filename: "rules_2024.pdf", relevance: 0.95},       │
│        {filename: "handbook_cs.pdf", relevance: 0.87}        │
│      ],                                                     │
│      follow_up_questions: [                                 │
│        "What happens if attendance falls below 75%?",        │
│        "Are there any attendance waivers?"                    │
│      ]                                                      │
│    }                                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: Display Response                                   │
│  - Show: AI answer with confidence score                      │
│  - Show: Source documents with relevance                      │
│  - Show: Follow-up question buttons                          │
│  - Update: Chat interface with new messages                  │
└─────────────────────────────────────────────────────────────────┘
```

### 🗄️ Database Schema for AI Conversations

```sql
-- AI Conversations
CREATE TABLE ai_conversations (
    id INT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255),              -- "New Chat" or first message
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- AI Messages
CREATE TABLE ai_messages (
    id INT PRIMARY KEY,
    conversation_id INT,
    content TEXT,
    sender_type ENUM('user', 'ai'),
    confidence DECIMAL(3,2),         -- AI response confidence
    sources JSON,                    -- Array of source documents
    follow_up_questions JSON,       -- Array of follow-up questions
    intent_detected VARCHAR(100),
    created_at TIMESTAMP
);
```

### 🔧 Technical Components

#### **1. Document Processing Pipeline**
- **Text Extraction**: PyPDF2 (PDF), python-docx (DOC/DOCX)
- **Text Cleaning**: Custom regex-based cleaning
- **Chunking**: Semantic chunking with overlap
- **Embeddings**: all-MiniLM-L6-v2 (384 dimensions)
- **Vector DB**: ChromaDB with HNSW indexing

#### **2. AI Chat Components**
- **Orchestrator**: LangGraph state machine
- **LLM**: Gemini 2.5 Flash (configurable)
- **Reranker**: cross-encoder/ms-marco-MiniLM-L-6-v2
- **Vector DB**: ChromaDB for semantic search
- **Security**: Rate limiting, PII masking, input validation

#### **3. Key Technologies**
- **Backend**: FastAPI, SQLAlchemy, MySQL
- **AI Framework**: LangGraph, LangChain
- **Vector Database**: ChromaDB
- **Embeddings**: Sentence Transformers
- **Frontend**: React, TypeScript

### 📊 Performance Metrics

#### **Document Processing**
- **Text Extraction**: ~500ms per 10-page PDF
- **Text Cleaning**: ~100ms per document
- **Chunking**: ~50ms per document
- **Embedding**: ~2-3 seconds per 100 chunks
- **Vector Upsert**: ~1 second per 100 chunks

#### **AI Chat Response**
- **Security Validation**: ~50ms
- **Intent Classification**: ~200ms
- **Vector Search**: ~100ms
- **Reranking**: ~150ms
- **Answer Generation**: ~1-2 seconds
- **Total Response Time**: ~2-3 seconds

### 🔒 Security Features

1. **Rate Limiting**: 10 requests/minute per user
2. **PII Masking**: Automatic detection and masking of sensitive data
3. **Input Validation**: Character limits, special character handling
4. **Role-Based Access**: Only students can use AI chat
5. **Conversation Isolation**: Users can only access their own conversations

### 🎯 Personalization Features

1. **User Context**: Department, semester, enrollment number
2. **Filtering**: Search results filtered by user's department/semester
3. **Conversation Memory**: Last 5-10 messages provide context
4. **Intent Recognition**: Adapts responses based on query type
5. **Follow-up Suggestions**: Context-aware question suggestions

This architecture ensures that uploaded documents are properly processed and indexed for semantic search, while the AI chatbot provides accurate, contextualized responses based on the indexed knowledge base and user-specific information.