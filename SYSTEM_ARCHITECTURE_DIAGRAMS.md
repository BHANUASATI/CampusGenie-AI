# CampusGenie-AI System Architecture Diagrams

## HIGH-LEVEL SYSTEM ARCHITECTURE

```mermaid
graph TB
    subgraph "🎨 FRONTEND LAYER"
        ReactApp[React 19 + TypeScript<br/>localhost:3000]
        ContextProviders[Context Providers<br/>App, Theme, Language]
        ComponentLayer[Component Layer<br/>Role-based UI Components]
        ServiceLayer[Service Layer<br/>API Client]
    end
    
    subgraph "⚡ BACKEND LAYER"
        FastAPI[FastAPI Application<br/>localhost:8002]
        RouterLayer[Router Layer<br/>Role-based API Routes]
        AuthLayer[Authentication Layer<br/>JWT + RBAC]
        BusinessLogic[Business Logic Layer<br/>Services & Models]
    end
    
    subgraph "🤖 AI ENGINE LAYER"
        LangGraph[LangGraph Orchestrator]
        RAGSystem[RAG System]
        DocumentPipeline[Document Processing Pipeline]
        LLMProvider[LLM Provider Layer<br/>Gemini + OpenRouter]
    end
    
    subgraph "🗄️ DATA LAYER"
        MySQL[(MySQL Database<br/>Relational Data)]
        ChromaDB[(ChromaDB<br/>Vector Store)]
        FileSystem[File System<br/>Document Storage]
    end
    
    ReactApp --> ContextProviders
    ContextProviders --> ComponentLayer
    ComponentLayer --> ServiceLayer
    ServiceLayer -->|REST API| FastAPI
    
    FastAPI --> RouterLayer
    RouterLayer --> AuthLayer
    AuthLayer --> BusinessLogic
    BusinessLogic --> LangGraph
    
    LangGraph --> RAGSystem
    LangGraph --> DocumentPipeline
    LangGraph --> LLMProvider
    
    RAGSystem --> ChromaDB
    DocumentPipeline --> ChromaDB
    DocumentPipeline --> FileSystem
    
    BusinessLogic --> MySQL
    AuthLayer --> MySQL
    LangGraph --> MySQL
    
    style ReactApp fill:#FF6B6B
    style FastAPI fill:#4ECDC4
    style LangGraph fill:#FFE66D
    style MySQL fill:#95E1D3
    style ChromaDB fill:#DDA0DD
    style ContextProviders fill:#F7DC6F
    style RouterLayer fill:#82E0AA
    style AuthLayer fill:#85C1E9
    style BusinessLogic fill:#F8B500
    style RAGSystem fill:#BB8FCE
    style DocumentPipeline fill:#F1948A
    style LLMProvider fill:#82E0AA
    style FileSystem fill:#D7BDE2
```

## DETAILED FRONTEND ARCHITECTURE

```mermaid
graph TB
    subgraph "🎨 FRONTEND STRUCTURE"
        App[App.tsx<br/>Main Application]
        AppRoutes[AppRoutes.tsx<br/>Route Management]
        
        subgraph "📚 CONTEXT LAYER"
            AppContext[AppContext.tsx<br/>State Management]
            ThemeContext[ThemeContext.tsx<br/>Theme Management]
            LanguageContext[LanguageContext.tsx<br/>Internationalization]
        end
        
        subgraph "📄 PAGES LAYER"
            StudentDashboard[StudentDashboard.tsx<br/>Student Portal]
            FacultyDashboard[FacultyDashboardNew.tsx<br/>Faculty Portal]
            AdminDashboard[AdminDashboard.tsx<br/>Admin Portal]
            RegistrarDashboard[RegistrarDashboard.tsx<br/>Registrar Portal]
            AuthPage[AuthPage.tsx<br/>Authentication]
        end
        
        subgraph "🧩 COMPONENTS LAYER"
            FacultyComponents[Faculty Components<br/>ApprovalQueue, Analytics, etc.]
            TaskComponents[Task Components<br/>TaskCard, SemesterManager]
            CalendarComponents[Calendar Components<br/>Event Management]
            AuthComponents[Auth Components<br/>Login, Register Forms]
            AdminComponents[Admin Components<br/>User Management]
            DashboardComponents[Dashboard Components<br/>Stats & Charts]
            CommonComponents[Common Components<br/>Shared UI Elements]
        end
        
        subgraph "🔌 SERVICES LAYER"
            APIService[api.ts<br/>REST API Client]
            AuthService[Authentication Service<br/>Login/Logout]
            StudentService[Student Service<br/>Profile & Data]
            FacultyService[Faculty Service<br/>Faculty Operations]
            AdminService[Admin Service<br/>Admin Operations]
            AIService[AI Assistant Service<br/>Chat Functions]
            AIDocService[AI Document Service<br/>Knowledge Base]
        end
        
        subgraph "🛠️ UTILS LAYER"
            AcademicEngine[academicEngine.ts<br/>Task Generation Logic]
            Types[types/index.ts<br/>TypeScript Type Definitions]
        end
    end
    
    App --> AppRoutes
    AppRoutes --> AppContext
    AppRoutes --> ThemeContext
    AppRoutes --> LanguageContext
    
    AppContext --> StudentDashboard
    AppContext --> FacultyDashboard
    AppContext --> AdminDashboard
    AppContext --> RegistrarDashboard
    AppContext --> AuthPage
    
    StudentDashboard --> TaskComponents
    StudentDashboard --> CommonComponents
    FacultyDashboard --> FacultyComponents
    AdminDashboard --> AdminComponents
    
    AuthPage --> AuthComponents
    
    APIService --> AuthService
    APIService --> StudentService
    APIService --> FacultyService
    APIService --> AdminService
    APIService --> AIService
    APIService --> AIDocService
    
    StudentDashboard --> StudentService
    FacultyDashboard --> FacultyService
    AdminDashboard --> AdminService
    
    AppContext --> APIService
    AcademicEngine --> AppContext
    
    style App fill:#FF6B6B
    style AppRoutes fill:#4ECDC4
    style AppContext fill:#FFE66D
    style ThemeContext fill:#95E1D3
    style LanguageContext fill:#DDA0DD
    style StudentDashboard fill:#F7DC6F
    style FacultyDashboard fill:#82E0AA
    style AdminDashboard fill:#85C1E9
    style RegistrarDashboard fill:#F8B500
    style AuthPage fill:#BB8FCE
    style APIService fill:#F1948A
    style AcademicEngine fill:#82E0AA
```

## DETAILED BACKEND ARCHITECTURE

```mermaid
graph TB
    subgraph "⚡ BACKEND STRUCTURE"
        Main[main.py<br/>Application Entry Point]
        
        subgraph "🛣️ ROUTER LAYER"
            AuthRouter[auth_routes.py<br/>Authentication Endpoints]
            StudentRouter[student_routes.py<br/>Student APIs]
            FacultyRouter[faculty_routes_new.py<br/>Faculty APIs]
            AdminRouter[admin_routes.py<br/>Admin APIs]
            TaskRouter[task_routes.py<br/>Task Management]
            DocumentRouter[document_routes.py<br/>Document APIs]
            CalendarRouter[calendar_routes.py<br/>Calendar APIs]
            RegistrarRouter[registrar_routes.py<br/>Registrar APIs]
            SchoolRouter[school_routes.py<br/>School APIs]
            OAuthRouter[oauth_routes.py<br/>OAuth Integration]
        end
        
        subgraph "🤖 AI ROUTER LAYER"
            AIRouter[ai_routes.py<br/>AI Chat API]
            AIDocRouter[document_routes.py<br/>AI Document API]
            AIHealthRouter[health.py<br/>Health Check API]
        end
        
        subgraph "🔧 CORE LAYER"
            Models[models.py<br/>SQLAlchemy Models]
            Schemas[schemas.py<br/>Pydantic Schemas]
            Auth[auth.py<br/>JWT Functions]
            Security[security.py<br/>Password Hashing]
            Database[database.py<br/>DB Connection]
            Config[config.py<br/>Configuration]
            Dependencies[dependencies.py<br/>Auth Dependencies]
        end
        
        subgraph "🧠 AI ENGINE STRUCTURE"
            subgraph "🤖 AI AGENTS"
                MemoryManager[memory_manager.py<br/>Load/Save Memory]
                IntentClassifier[intent_classifier.py<br/>Query Classification]
                Retriever[retriever.py<br/>RAG Retrieval]
                ToolCaller[tool_caller.py<br/>DB Tool Calls]
                AnswerGenerator[answer_generator.py<br/>Response Generation]
            end
            
            subgraph "🔗 AI GRAPH"
                Orchestrator[orchestrator.py<br/>LangGraph Builder]
                Edges[edges.py<br/>Conditional Routing]
            end
            
            subgraph "📄 AI PIPELINE"
                Extractor[extractor.py<br/>Text Extraction]
                Cleaner[cleaner.py<br/>Text Cleaning]
                Chunker[chunker.py<br/>Text Chunking]
                Indexer[indexer.py<br/>Document Indexing]
            end
            
            subgraph "⚙️ AI CORE"
                LLMClient[llm/client.py<br/>LLM with Fallback]
                EmbeddingModel[embeddings/model.py<br/>Sentence Transformers]
                Reranker[embeddings/reranker.py<br/>Cross-Encoder]
                VectorStore[vectorstore/manager.py<br/>ChromaDB Client]
                AIConfig[core/config.py<br/>AI Configuration]
            end
            
            subgraph "🎯 AI SERVICES"
                ChatService[chat_service.py<br/>Chat Orchestration]
                DocumentService[document_service.py<br/>Doc Management]
            end
            
            subgraph "📋 AI SCHEMAS"
                AgentState[agent_state.py<br/>Graph State]
                IntentSchema[intent.py<br/>Intent Types]
                ResponseSchema[response.py<br/>Response Types]
                RetrievalSchema[retrieval.py<br/>Retrieval Types]
            end
            
            subgraph "💬 AI PROMPTS"
                SystemPrompt[system_prompt.py<br/>System Prompts]
                IntentPrompt[intent_prompt.py<br/>Classification Prompts]
                RAGPrompt[rag_prompt.py<br/>RAG Prompts]
                SafetyPrompt[safety_prompt.py<br/>Safety Prompts]
            end
            
            subgraph "🗄️ AI REPOSITORIES"
                ConversationRepo[conversation_repo.py<br/>Conversation DB]
            end
        end
    end
    
    Main --> AuthRouter
    Main --> StudentRouter
    Main --> FacultyRouter
    Main --> AdminRouter
    Main --> TaskRouter
    Main --> DocumentRouter
    Main --> CalendarRouter
    Main --> RegistrarRouter
    Main --> SchoolRouter
    Main --> OAuthRouter
    
    Main --> AIRouter
    Main --> AIDocRouter
    Main --> AIHealthRouter
    
    AuthRouter --> Auth
    AuthRouter --> Security
    StudentRouter --> Models
    FacultyRouter --> Models
    AdminRouter --> Models
    
    AIRouter --> ChatService
    AIDocRouter --> DocumentService
    
    ChatService --> Orchestrator
    Orchestrator --> MemoryManager
    Orchestrator --> IntentClassifier
    Orchestrator --> Retriever
    Orchestrator --> ToolCaller
    Orchestrator --> AnswerGenerator
    
    DocumentService --> Extractor
    DocumentService --> Cleaner
    DocumentService --> Chunker
    DocumentService --> Indexer
    
    Retriever --> EmbeddingModel
    Retriever --> Reranker
    Retriever --> VectorStore
    
    Indexer --> EmbeddingModel
    Indexer --> VectorStore
    
    AnswerGenerator --> LLMClient
    IntentClassifier --> LLMClient
    
    ChatService --> ConversationRepo
    MemoryManager --> ConversationRepo
    
    Orchestrator --> AgentState
    IntentClassifier --> IntentSchema
    AnswerGenerator --> ResponseSchema
    Retriever --> RetrievalSchema
    
    AnswerGenerator --> SystemPrompt
    AnswerGenerator --> RAGPrompt
    IntentClassifier --> IntentPrompt
    AnswerGenerator --> SafetyPrompt
    
    style Main fill:#FF6B6B
    style Orchestrator fill:#FFE66D
    style LLMClient fill:#E74C3C
    style AuthRouter fill:#4ECDC4
    style StudentRouter fill:#95E1D3
    style FacultyRouter fill:#DDA0DD
    style AdminRouter fill:#F7DC6F
    style Models fill:#82E0AA
    style Schemas fill:#85C1E9
    style ChatService fill:#F8B500
    style DocumentService fill:#BB8FCE
```

## DATABASE SCHEMA ARCHITECTURE

```mermaid
graph TB
    subgraph "🗄️ DATABASE STRUCTURE"
        subgraph "👥 USER HIERARCHY"
            Users[users<br/>Base Authentication Table]
            Students[students<br/>Student Profile Data]
            Faculties[faculties<br/>Faculty Profile Data]
            Admins[admins<br/>Admin Profile Data]
        end
        
        subgraph "🏫 ORGANIZATIONAL STRUCTURE"
            Schools[schools<br/>University Schools]
            Departments[departments<br/>Academic Departments]
            Courses[courses<br/>Academic Courses]
        end
        
        subgraph "📄 DOCUMENT MANAGEMENT"
            DocumentTypes[document_types<br/>Document Categories]
            StudentDocuments[student_documents<br/>Uploaded Documents]
        end
        
        subgraph "📋 TASK MANAGEMENT"
            Tasks[tasks<br/>Assigned Tasks]
            TaskSubmissions[task_submissions<br/>Student Submissions]
        end
        
        subgraph "🤖 AI SYSTEM"
            AIConversations[ai_conversations<br/>Chat Sessions]
            AIMessages[ai_messages<br/>Chat Messages]
        end
        
        subgraph "⚙️ SYSTEM MANAGEMENT"
            AuditLogs[audit_logs<br/>Action History]
            Notifications[notifications<br/>User Notifications]
        end
    end
    
    Users --> Students
    Users --> Faculties
    Users --> Admins
    
    Schools --> Departments
    Departments --> Courses
    Departments --> Students
    Departments --> Faculties
    Departments --> Tasks
    
    Students --> StudentDocuments
    Students --> Tasks
    Students --> TaskSubmissions
    
    DocumentTypes --> StudentDocuments
    
    Faculties --> Tasks
    Faculties --> StudentDocuments
    Faculties --> TaskSubmissions
    
    Tasks --> TaskSubmissions
    
    Users --> AIConversations
    AIConversations --> AIMessages
    
    Users --> AuditLogs
    Users --> Notifications
    
    Courses --> Students
    
    style Users fill:#E74C3C
    style Students fill:#27AE60
    style Faculties fill:#F39C12
    style Admins fill:#8E44AD
    style Schools fill:#3498DB
    style Departments fill:#16A085
    style Courses fill:#2ECC71
    style DocumentTypes fill:#E67E22
    style StudentDocuments fill:#D35400
    style Tasks fill:#C0392B
    style TaskSubmissions fill:#9B59B6
    style AIConversations fill:#1ABC9C
    style AIMessages fill:#34495E
    style AuditLogs fill:#7F8C8D
    style Notifications fill:#95A5A6
```

## AI ENGINE PROCESSING FLOW

```mermaid
graph LR
    subgraph "🔄 LANGGRAPH EXECUTION FLOW"
        Start[🚀 START]
        LoadMemory[🧠 load_memory<br/>Load Last 6 Turns]
        ClassifyIntent[🎯 classify_intent<br/>Gemini LLM]
        
        subgraph "⚡ PARALLEL PROCESSING"
            RetrieveContext[🔍 retrieve_context<br/>RAG Retrieval]
            ToolCall[🛠️ tool_call<br/>DB Tool Calls]
        end
        
        GenerateAnswer[💬 generate_answer<br/>LLM Generation]
        SaveMemory[💾 save_memory<br/>Persist to DB]
        End[✅ END]
    end
    
    subgraph "🌐 EXTERNAL SERVICES"
        ChromaDB[(🔍 ChromaDB<br/>Vector Search)]
        MySQL[(🗄️ MySQL<br/>Live Queries)]
        LLMProvider[🤖 LLM Provider<br/>Gemini/OpenRouter]
    end
    
    Start --> LoadMemory
    LoadMemory --> ClassifyIntent
    
    ClassifyIntent -->|needs_retrieval| RetrieveContext
    ClassifyIntent -->|needs_tool| ToolCall
    ClassifyIntent -->|greeting/general| GenerateAnswer
    
    RetrieveContext --> ChromaDB
    ToolCall --> MySQL
    
    RetrieveContext --> GenerateAnswer
    ToolCall --> GenerateAnswer
    
    GenerateAnswer --> LLMProvider
    LLMProvider --> GenerateAnswer
    
    GenerateAnswer --> SaveMemory
    SaveMemory --> MySQL
    SaveMemory --> End
    
    style Start fill:#27AE60
    style End fill:#C0392B
    style ClassifyIntent fill:#F39C12
    style GenerateAnswer fill:#3498DB
    style LLMProvider fill:#9B59B6
    style LoadMemory fill:#E74C3C
    style SaveMemory fill:#16A085
    style RetrieveContext fill:#2ECC71
    style ToolCall fill:#E67E22
```

## DATA FLOW ARCHITECTURE

```mermaid
graph TB
    subgraph "🎨 FRONTEND DATA FLOW"
        UserActions[👤 User Actions]
        ReactState[⚛️ React State<br/>Context + Local]
        APIRequests[📡 API Requests]
    end
    
    subgraph "⚡ BACKEND DATA FLOW"
        APIHandlers[🔌 API Handlers]
        JWTValidation[🔐 JWT Validation]
        BusinessLogic[💼 Business Logic]
        DBQueries[🗄️ Database Queries]
    end
    
    subgraph "🤖 AI DATA FLOW"
        AIRequests[🤖 AI Requests]
        LangGraphExecution[🔄 LangGraph Execution]
        VectorOperations[🔢 Vector Operations]
        LLMCalls[🧠 LLM API Calls]
    end
    
    subgraph "💾 DATA STORAGE"
        MySQLData[(🗄️ MySQL Data)]
        VectorData[(🔍 Vector Data)]
        FileStorage[📁 File Storage]
    end
    
    UserActions --> ReactState
    ReactState --> APIRequests
    APIRequests --> APIHandlers
    
    APIHandlers --> JWTValidation
    JWTValidation --> BusinessLogic
    BusinessLogic --> DBQueries
    DBQueries --> MySQLData
    
    APIHandlers --> AIRequests
    AIRequests --> LangGraphExecution
    LangGraphExecution --> VectorOperations
    LangGraphExecution --> LLMCalls
    
    VectorOperations --> VectorData
    DBQueries --> VectorData
    BusinessLogic --> FileStorage
    
    MySQLData --> DBQueries
    VectorData --> VectorOperations
    FileStorage --> BusinessLogic
    
    style UserActions fill:#FF6B6B
    style ReactState fill:#4ECDC4
    style APIRequests fill:#FFE66D
    style LangGraphExecution fill:#95E1D3
    style MySQLData fill:#DDA0DD
    style VectorData fill:#F7DC6F
    style FileStorage fill:#82E0AA
```

## SECURITY & AUTHENTICATION FLOW

```mermaid
graph TB
    subgraph "🔐 AUTHENTICATION FLOW"
        UserCredentials[👤 User Credentials]
        LoginRequest[📝 POST /api/auth/login]
        PasswordVerification[🔍 Password Verification]
        JWTGeneration[🎫 JWT Token Generation]
        TokenResponse[✅ Token Response]
    end
    
    subgraph "🛡️ AUTHORIZATION FLOW"
        ProtectedRequest[🔒 Protected API Request]
        JWTValidation[🔐 JWT Validation]
        UserContextExtraction[👤 User Context Extraction]
        RoleCheck[🎭 Role-Based Access Check]
        PermissionCheck[✓ Permission Check]
        RequestProcessing[⚙️ Request Processing]
    end
    
    subgraph "🔒 SECURITY COMPONENTS"
        PasswordHashing[🔐 Bcrypt Password Hashing]
        JWTSigning[🎫 JWT Signing/Verification]
        RoleBasedAccess[🎭 RBAC System]
        AuditLogging[📋 Audit Logging]
    end
    
    UserCredentials --> LoginRequest
    LoginRequest --> PasswordVerification
    PasswordVerification --> PasswordHashing
    PasswordVerification --> JWTGeneration
    JWTGeneration --> JWTSigning
    JWTGeneration --> TokenResponse
    
    ProtectedRequest --> JWTValidation
    JWTValidation --> JWTSigning
    JWTValidation --> UserContextExtraction
    UserContextExtraction --> RoleCheck
    RoleCheck --> RoleBasedAccess
    RoleCheck --> PermissionCheck
    PermissionCheck --> RequestProcessing
    RequestProcessing --> AuditLogging
    
    style PasswordHashing fill:#C0392B
    style JWTSigning fill:#F39C12
    style RoleBasedAccess fill:#27AE60
    style AuditLogging fill:#8E44AD
    style UserCredentials fill:#E74C3C
    style TokenResponse fill:#2ECC71
    style RequestProcessing fill:#3498DB
```

## DOCUMENT PROCESSING PIPELINE

```mermaid
graph TB
    subgraph "📄 DOCUMENT UPLOAD FLOW"
        UploadStart[🚀 Upload Start]
        FileValidation[🔍 File Validation]
        SaveToDB[💾 Save to Database]
        SaveToFileSystem[📁 Save to File System]
        TriggerIndexing[⚡ Trigger AI Indexing]
    end
    
    subgraph "🤖 AI INDEXING PIPELINE"
        TextExtraction[📝 Text Extraction<br/>PDF/DOCX/TXT]
        TextCleaning[🧹 Text Cleaning<br/>Remove noise]
        TextChunking[✂️ Text Chunking<br/>512 tokens, 50 overlap]
        EmbeddingGeneration[🔢 Embedding Generation<br/>Sentence Transformers]
        VectorStorage[💾 Vector Storage<br/>ChromaDB]
        IndexingComplete[✅ Indexing Complete]
    end
    
    subgraph "🔍 QUERY PROCESSING"
        UserQuery[❓ User Query]
        QueryEmbedding[🔢 Query Embedding]
        VectorSearch[🔍 Vector Search]
        ResultReranking[📊 Result Reranking]
        FinalResults[✅ Final Results]
    end
    
    UploadStart --> FileValidation
    FileValidation --> SaveToDB
    SaveToDB --> SaveToFileSystem
    SaveToFileSystem --> TriggerIndexing
    
    TriggerIndexing --> TextExtraction
    TextExtraction --> TextCleaning
    TextCleaning --> TextChunking
    TextChunking --> EmbeddingGeneration
    EmbeddingGeneration --> VectorStorage
    VectorStorage --> IndexingComplete
    
    UserQuery --> QueryEmbedding
    QueryEmbedding --> VectorSearch
    VectorSearch --> ResultReranking
    ResultReranking --> FinalResults
    
    style UploadStart fill:#27AE60
    style TextExtraction fill:#3498DB
    style TextCleaning fill:#9B59B6
    style TextChunking fill:#E74C3C
    style EmbeddingGeneration fill:#F39C12
    style VectorStorage fill:#2ECC71
    style UserQuery fill:#16A085
    style FinalResults fill:#1ABC9C
```

## MULTI-ROLE PORTAL ARCHITECTURE

```mermaid
graph TB
    subgraph "🎨 STUDENT PORTAL"
        S1[📤 Upload Documents]
        S2[📊 View Grades & GPA]
        S3[📅 Check Timetable]
        S4[🤖 Chat with AI Assistant]
        S5[📋 View Tasks & Deadlines]
        S6[👤 Profile Management]
    end
    
    subgraph "👨‍🏫 FACULTY PORTAL"
        F1[✅ Verify Documents]
        F2[📊 View Student Records]
        F3[📅 Manage Timetables]
        F4[📝 Create & Grade Tasks]
        F5[📈 Track Attendance]
        F6[📊 Faculty Analytics]
    end
    
    subgraph "👨‍💼 ADMIN PORTAL"
        A1[👥 User Management]
        A2[🏫 Course Setup]
        A3[🔧 System Configuration]
        A4[📊 Analytics Dashboard]
        A5[📚 Document Types Setup]
        A6[🔐 Role Management]
    end
    
    subgraph "👨‍⚖️ REGISTRAR PORTAL"
        R1[📊 Full Oversight]
        R2[📈 Analytics & Reports]
        R3[🔧 Bulk Operations]
        R4[👥 All User Management]
        R5[🏫 Academic Oversight]
        R6[📋 System Reports]
    end
    
    subgraph "🤖 SHARED AI FEATURES"
        AI1[💬 AI Chat Interface]
        AI2[🔍 Knowledge Base Search]
        AI3[📊 AI Analytics]
    end
    
    S4 --> AI1
    F1 --> DB[(🗄️ MySQL)]
    A1 --> DB
    R1 --> DB
    
    AI1 --> AI2
    AI2 --> AI3
    
    style S1 fill:#3498DB
    style F1 fill:#E74C3C
    style A1 fill:#27AE60
    style R1 fill:#9B59B6
    style AI1 fill:#F39C12
    style DB fill:#95A5A6
```

## API ENDPOINT ARCHITECTURE

```mermaid
graph TB
    subgraph "🔌 AUTHENTICATION APIS"
        AuthLogin[POST /api/auth/login<br/>User Login]
        AuthRegister[POST /api/auth/register<br/>User Registration]
        AuthMe[GET /api/auth/me<br/>Get Current User]
        AuthLogout[POST /api/auth/logout<br/>User Logout]
    end
    
    subgraph "👨‍🎓 STUDENT APIS"
        StudentProfile[GET /students/me<br/>Student Profile]
        StudentDashboard[GET /students/dashboard/stats<br/>Dashboard Stats]
        StudentDocs[GET /documents/my-documents-status<br/>Document Status]
        StudentTasks[GET /tasks<br/>Student Tasks]
        StudentSubmit[POST /tasks/{id}/submit<br/>Submit Task]
    end
    
    subgraph "👨‍🏫 FACULTY APIS"
        FacultyProfile[GET /faculty/simple/me<br/>Faculty Profile]
        FacultyDashboard[GET /faculty/dashboard/stats<br/>Dashboard Stats]
        FacultyPending[GET /faculty/documents/pending<br/>Pending Documents]
        FacultyVerify[PUT /faculty/documents/{id}/verify<br/>Verify Document]
        FacultyGrade[PUT /tasks/submissions/{id}/grade<br/>Grade Submission]
    end
    
    subgraph "👨‍💼 ADMIN APIS"
        AdminStats[GET /admin/stats<br/>System Statistics]
        AdminUsers[GET /admin/users<br/>User Management]
        AdminCreateUser[POST /admin/users<br/>Create User]
        AdminDepartments[GET /admin/departments<br/>Department Management]
        AdminAudit[GET /admin/audit/logs<br/>Audit Logs]
    end
    
    subgraph "🤖 AI APIS"
        AIConversations[GET /api/ai/conversations<br/>List Conversations]
        AICreateChat[POST /api/ai/conversations<br/>Create Conversation]
        AISendMessage[POST /api/ai/conversations/{id}/messages<br/>Send Message]
        AIQuickChat[POST /api/ai/chat<br/>Quick Chat]
        AIHealth[GET /api/ai/health<br/>Health Check]
        AIDocUpload[POST /api/ai/documents/upload<br/>Upload Knowledge Doc]
        AIDocList[GET /api/ai/documents<br/>List Documents]
    end
    
    subgraph "📅 CALENDAR APIS"
        CalendarEvents[GET /calendar/events<br/>Get Events]
        CalendarCreate[POST /calendar/events<br/>Create Event]
        CalendarUpdate[PUT /calendar/events/{id}<br/>Update Event]
        CalendarAcademic[GET /calendar/academic-events<br/>Academic Events]
    end
    
    subgraph "📄 DOCUMENT APIS"
        DocTypes[GET /documents/types<br/>Document Types]
        DocUpload[POST /documents/upload<br/>Upload Document]
        DocStudent[GET /documents/student/{id}<br/>Student Documents]
        DocDelete[DELETE /documents/{id}<br/>Delete Document]
    end
    
    style AuthLogin fill:#E74C3C
    style StudentProfile fill:#3498DB
    style FacultyProfile fill:#E67E22
    style AdminStats fill:#27AE60
    style AIConversations fill:#9B59B6
    style CalendarEvents fill:#16A085
    style DocUpload fill:#D35400
```

## COMPONENT COMMUNICATION FLOW

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Frontend as 🎨 React Frontend
    participant API as ⚡ FastAPI Backend
    participant Auth as 🔐 Auth Service
    participant AI as 🤖 AI Engine
    participant MySQL as 🗄️ MySQL
    participant Chroma as 🔍 ChromaDB
    
    User->>Frontend: Login Request
    Frontend->>API: POST /api/auth/login
    API->>Auth: Validate Credentials
    Auth->>MySQL: Query User
    MySQL-->>Auth: User Data
    Auth->>Auth: Generate JWT
    Auth-->>API: JWT Token
    API-->>Frontend: Token + User Info
    Frontend->>Frontend: Store Token
    
    User->>Frontend: Send AI Chat Message
    Frontend->>API: POST /api/ai/chat (with JWT)
    API->>Auth: Validate JWT
    Auth-->>API: User Context
    API->>AI: Process Query
    
    AI->>AI: Load Conversation History
    AI->>MySQL: Get Last 6 Messages
    MySQL-->>AI: Conversation History
    
    AI->>AI: Classify Intent
    AI->>AI: Route to RAG/Tools
    
    AI->>Chroma: Vector Search
    Chroma-->>AI: Retrieved Documents
    
    AI->>MySQL: Execute DB Tools
    MySQL-->>AI: Query Results
    
    AI->>AI: Generate Answer
    AI->>AI: Save to Memory
    AI->>MySQL: Store Conversation
    AI-->>API: AI Response
    API-->>Frontend: Final Response
    Frontend-->>User: Display Answer
```

## ERROR HANDLING & RECOVERY FLOW

```mermaid
graph TB
    subgraph "🔄 ERROR HANDLING SYSTEM"
        IncomingRequest[📥 Incoming Request]
        TryExecution[🎯 Try Execution]
        
        subgraph "❌ ERROR DETECTION"
            ValidationError[📝 Validation Error]
            AuthError[🔐 Authentication Error]
            DatabaseError[🗄️ Database Error]
            AIError[🤖 AI Error]
            NetworkError[🌐 Network Error]
        end
        
        subgraph "🛠️ RECOVERY STRATEGIES"
            RetryLogic[🔄 Retry Logic]
            FallbackStrategy[🔄 Fallback Strategy]
            GracefulDegradation[🛡️ Graceful Degradation]
        end
        
        subgraph "📧 ERROR NOTIFICATION"
            LogError[📝 Log Error]
            NotifyUser[📧 Notify User]
            AlertAdmin[🚨 Alert Admin]
        end
        
        SuccessResponse[✅ Success Response]
        ErrorResponse[❓ Error Response]
    end
    
    IncomingRequest --> TryExecution
    
    TryExecution -->|Success| SuccessResponse
    TryExecution -->|Error| ValidationError
    TryExecution -->|Error| AuthError
    TryExecution -->|Error| DatabaseError
    TryExecution -->|Error| AIError
    TryExecution -->|Error| NetworkError
    
    DatabaseError --> RetryLogic
    NetworkError --> RetryLogic
    AIError --> FallbackStrategy
    
    RetryLogic -->|Success| SuccessResponse
    RetryLogic -->|Failed| FallbackStrategy
    
    FallbackStrategy -->|Success| SuccessResponse
    FallbackStrategy -->|Failed| GracefulDegradation
    
    ValidationError --> LogError
    AuthError --> LogError
    GracefulDegradation --> LogError
    
    LogError --> NotifyUser
    LogError --> AlertAdmin
    
    NotifyUser --> ErrorResponse
    GracefulDegradation --> ErrorResponse
    
    style IncomingRequest fill:#3498DB
    style SuccessResponse fill:#27AE60
    style ValidationError fill:#E74C3C
    style AuthError fill:#F39C12
    style DatabaseError fill:#9B59B6
    style AIError fill:#E67E22
    style NetworkError fill:#16A085
    style RetryLogic fill:#2ECC71
    style FallbackStrategy fill:#34495E
    style GracefulDegradation fill:#95A5A6
```

## DEPLOYMENT ARCHITECTURE

```mermaid
graph TB
    subgraph "🌐 PRODUCTION ENVIRONMENT"
        subgraph "📱 CLIENT LAYER"
            WebApp[React Web App<br/>CDN Hosting]
            MobileApp[Mobile App<br/>React Native]
        end
        
        subgraph "⚡ API LAYER"
            LoadBalancer[Load Balancer<br/>Nginx/HAProxy]
            APIInstances[FastAPI Instances<br/>Multiple Servers]
        end
        
        subgraph "🤖 AI LAYER"
            AIInstances[AI Engine Instances<br/>GPU Servers]
            VectorDB[ChromaDB Cluster<br/>Vector Search]
        end
        
        subgraph "🗄️ DATA LAYER"
            MySQLPrimary[MySQL Primary<br/>Master Database]
            MySQLReplica[MySQL Replica<br/>Read Replicas]
            RedisCache[Redis Cache<br/>Session Storage]
        end
        
        subgraph "📊 MONITORING LAYER"
            Logging[Centralized Logging<br/>ELK Stack]
            Metrics[Metrics Collection<br/>Prometheus]
            Alerts[Alerting System<br/>Grafana]
        end
        
        subgraph "🔒 SECURITY LAYER"
            Firewall[Firewall<br/>Security Rules]
            SSLTermination[SSL Termination<br/>HTTPS]
            DDoSProtection[DDoS Protection<br/>Cloudflare]
        end
    end
    
    WebApp --> DDoSProtection
    MobileApp --> DDoSProtection
    DDoSProtection --> SSLTermination
    SSLTermination --> Firewall
    Firewall --> LoadBalancer
    
    LoadBalancer --> APIInstances
    APIInstances --> AIInstances
    APIInstances --> MySQLPrimary
    APIInstances --> MySQLReplica
    APIInstances --> RedisCache
    
    AIInstances --> VectorDB
    
    APIInstances --> Logging
    AIInstances --> Logging
    MySQLPrimary --> Logging
    
    APIInstances --> Metrics
    AIInstances --> Metrics
    MySQLPrimary --> Metrics
    
    Metrics --> Alerts
    
    style WebApp fill:#3498DB
    style LoadBalancer fill:#E74C3C
    style APIInstances fill:#27AE60
    style AIInstances fill:#9B59B6
    style MySQLPrimary fill:#F39C12
    style VectorDB fill:#16A085
    style RedisCache fill:#2ECC71
    style Logging fill:#E67E22
    style Metrics fill:#34495E
    style Alerts fill:#95A5A6
```

## TECHNOLOGY STACK SUMMARY

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, TypeScript, Tailwind CSS | User Interface |
| **Backend** | Python 3.11, FastAPI 0.104 | API Server |
| **Database** | MySQL 8.0+ | Relational Data Storage |
| **Vector DB** | ChromaDB 0.4 | Semantic Search |
| **AI Orchestration** | LangGraph 0.2, LangChain 0.2 | AI Workflow |
| **Primary LLM** | Google Gemini 2.5 Flash | AI Responses |
| **Fallback LLM** | OpenRouter (NVIDIA) | Backup AI |
| **Embeddings** | sentence-transformers | Text Vectors |
| **Authentication** | JWT, python-jose | User Auth |
| **Password Security** | bcrypt | Password Hashing |

## KEY ARCHITECTURAL PATTERNS

### 1. **Layered Architecture**
- Clear separation between presentation, application, domain, and infrastructure layers
- Each layer has specific responsibilities and minimal coupling

### 2. **Microservices-Ready**
- AI Engine is self-contained and can be deployed separately
- Modular router structure allows easy service extraction

### 3. **Event-Driven Elements**
- Document upload triggers AI indexing pipeline
- Status changes trigger notifications

### 4. **Repository Pattern**
- Database access abstracted through repository classes
- Easy to switch database implementations

### 5. **Service Layer Pattern**
- Business logic separated from API controllers
- Reusable service components

### 6. **Strategy Pattern**
- Multiple LLM providers with fallback strategy
- Pluggable authentication methods

### 7. **Observer Pattern**
- React Context for state management
- Database triggers for audit logging

---

## CONCLUSION

This architecture provides a robust, scalable foundation for the CampusGenie-AI educational management system. The clear separation of concerns, modular design, and modern technology stack ensure maintainability and extensibility while the AI integration provides intelligent features to enhance the user experience.

The system supports multiple user roles (Student, Faculty, Admin, Registrar) with appropriate access controls, comprehensive document management, task assignment and tracking, and an advanced AI assistant for natural language queries over academic data.
