# RAG Documents Testing Task - 20 Document Trial 5 trials done today also control hallucination


## 📋 Task Overview
**Assigned To**: [Teammate Name]  
**Due Date**: [Date]  
**Priority**: High  
**Project**: CampusGenie - AI Assistant RAG System  

### Objective
Test the RAG (Retrieval-Augmented Generation) document system using 20 trial documents to verify:
- Document upload functionality
- AI knowledge base indexing
- Chat query accuracy and relevance
- System performance and response quality

---

## 🎯 Test Cases & Requirements

### 1. Document Upload Test Cases

#### Test Case 1.1: PDF Document Upload
- **Action**: Upload a PDF document (up to 50MB)
- **Expected Result**: 
  - Document uploads successfully
  - Shows as "Processing" then "Indexed" status
  - No error messages
- **Screenshot Required**: Upload modal + success message

#### Test Case 1.2: DOCX Document Upload
- **Action**: Upload a Word document
- **Expected Result**: 
  - Document uploads and processes successfully
  - Content extracted properly
- **Screenshot Required**: Upload confirmation

#### Test Case 1.3: CSV Document Upload
- **Action**: Upload a CSV file with tabular data
- **Expected Result**: 
  - CSV data processed correctly
  - Tables/structured data indexed
- **Screenshot Required**: Upload success screen

#### Test Case 1.4: TXT/MD Document Upload
- **Action**: Upload plain text or markdown files
- **Expected Result**: 
  - Text content extracted and indexed
  - Formatting preserved where applicable
- **Screenshot Required**: Document list showing uploaded files

#### Test Case 1.5: Invalid File Type Rejection
- **Action**: Try uploading unsupported file type (e.g., .exe, .zip)
- **Expected Result**: 
  - Clear error message shown
  - File rejected without processing
- **Screenshot Required**: Error message display

#### Test Case 1.6: Large File Handling
- **Action**: Upload a file close to 50MB limit
- **Expected Result**: 
  - File uploads successfully
  - Processing completes without timeout
- **Screenshot Required**: Upload progress + completion

#### Test Case 1.7: Duplicate Document Handling
- **Action**: Upload the same document twice
- **Expected Result**: 
  - System handles duplicates appropriately
  - Either updates existing or shows duplicate warning
- **Screenshot Required**: Duplicate handling message

---

### 2. AI Knowledge Base Verification

#### Test Case 2.1: Document Indexing Status
- **Action**: Check document indexing status after upload
- **Expected Result**: 
  - All 20 documents show "Indexed" status
  - Processing time reasonable (< 2 minutes per document)
- **Screenshot Required**: Document list with all indexed status

#### Test Case 2.2: Vector Store Statistics
- **Action**: Check AI system health endpoint
- **Expected Result**: 
  - Shows total chunks indexed
  - Shows unique documents count
  - ChromaDB connection healthy
- **Screenshot Required**: `/api/ai/health` response or admin dashboard stats

#### Test Case 2.3: Document Metadata Verification
- **Action**: Verify document metadata is stored correctly
- **Expected Result**: 
  - Document type, department, semester fields correct
  - Upload timestamps accurate
  - File names preserved
- **Screenshot Required**: Document details view

---

### 3. AI Chat Query Testing

#### Test Case 3.1: Basic Information Retrieval
- **Action**: Ask a simple factual question from uploaded documents
- **Example Query**: "What are the admission requirements for Computer Science?"
- **Expected Result**: 
  - AI provides accurate answer from documents
  - Sources referenced properly
  - Response relevant and complete
- **Screenshot Required**: Chat interface with query and response

#### Test Case 3.2: Complex Multi-Document Queries
- **Action**: Ask questions requiring information from multiple documents
- **Example Query**: "Compare the course structures of CS and IT departments"
- **Expected Result**: 
  - AI synthesizes information from multiple sources
  - Comprehensive comparison provided
  - Logical structure maintained
- **Screenshot Required**: Complex query response

#### Test Case 3.3: Specific Data Point Queries
- **Action**: Query specific data points (dates, numbers, names)
- **Example Query**: "What is the deadline for scholarship applications?"
- **Expected Result**: 
  - Exact data points retrieved accurately
  - No hallucinations or incorrect information
- **Screenshot Required**: Specific data query response

#### Test Case 3.4: Context-Aware Queries
- **Action**: Ask follow-up questions in conversation
- **Example Query**: Follow up to previous answer with related question
- **Expected Result**: 
  - AI maintains conversation context
  - References previous exchanges appropriately
  - Natural dialogue flow
- **Screenshot Required**: Conversation thread showing context awareness

#### Test Case 3.5: Out-of-Scope Query Handling
- **Action**: Ask questions outside the document scope
- **Example Query**: "What is the weather today?"
- **Expected Result**: 
  - AI politely indicates information not available
  - Suggests relevant topics from documents
  - No misleading answers
- **Screenshot Required**: Out-of-scope query response

#### Test Case 3.6: Ambiguous Query Resolution
- **Action**: Ask ambiguous questions
- **Example Query**: "What are the fees?"
- **Expected Result**: 
  - AI asks for clarification or provides multiple fee structures
  - Covers different fee types if applicable
- **Screenshot Required**: Ambiguous query handling

#### Test Case 3.7: Performance Under Load
- **Action**: Send 10 rapid queries in succession
- **Expected Result**: 
  - All queries respond within reasonable time (< 10 seconds)
  - No system crashes or timeouts
  - Response quality maintained
- **Screenshot Required**: Multiple rapid queries in chat interface

---

### 4. Document Search & Retrieval Testing

#### Test Case 4.1: Keyword Search Accuracy
- **Action**: Test keyword-based retrieval
- **Expected Result**: 
  - Relevant documents retrieved for keywords
  - Search ranking appropriate
- **Screenshot Required**: Search results for specific keyword

#### Test Case 4.2: Semantic Search Testing
- **Action**: Test semantic similarity searches
- **Expected Result**: 
  - Conceptually similar documents found
  - Not just keyword matching
- **Screenshot Required**: Semantic search results

#### Test Case 4.3: Cross-Department Queries
- **Action**: Query information across different departments
- **Expected Result**: 
  - AI retrieves relevant info from multiple departments
  - Department-specific context maintained
- **Screenshot Required**: Cross-department query response

---

### 5. User Interface Testing

#### Test Case 5.1: Admin Document Management
- **Action**: Test admin document upload interface
- **Expected Result**: 
  - Intuitive upload workflow
  - Clear progress indicators
  - Proper error handling
- **Screenshot Required**: Admin upload interface

#### Test Case 5.2: Student AI Chat Interface
- **Action**: Test student chat interface with RAG
- **Expected Result**: 
  - Clean, responsive chat UI
  - Clear message formatting
  - Loading states visible
- **Screenshot Required**: Student chat interface

#### Test Case 5.3: Response Formatting
- **Action**: Check AI response formatting
- **Expected Result**: 
  - Proper markdown formatting
  - Code blocks formatted correctly
  - Lists and tables rendered properly
- **Screenshot Required**: Formatted response example

---

### 6. Edge Cases & Error Handling

#### Test Case 6.1: Empty Knowledge Base
- **Action**: Try querying with no documents uploaded
- **Expected Result**: 
  - Appropriate error message
  - No crashes or timeouts
- **Screenshot Required**: Empty knowledge base response

#### Test Case 6.2: Corrupted Document Handling
- **Action**: Attempt to upload corrupted file
- **Expected Result**: 
  - Graceful error handling
  - System remains stable
- **Screenshot Required**: Corrupted file error message

#### Test Case 6.3: Network Interruption
- **Action**: Simulate network issues during upload/query
- **Expected Result**: 
  - Proper retry mechanism
  - Clear error communication
- **Screenshot Required**: Network error handling

---

## 📸 Screenshot Guidelines

### Required Screenshots (20+ Total)
1. [ ] Document upload interface (empty state)
2. [ ] Document upload in progress
3. [ ] Document upload success (individual file)
4. [ ] Document list with all 20 uploaded files
5. [ ] Document indexing status showing all "Indexed"
6. [ ] AI health check endpoint response
7. [ ] Basic factual query response
8. [ ] Complex multi-document query response
9. [ ] Specific data point query response
10. [ ] Conversation thread showing context
11. [ ] Out-of-scope query handling
12. [ ] Ambiguous query clarification
13. [ ] Multiple rapid queries (performance test)
14. [ ] Keyword search results
15. [ ] Semantic search results
16. [ ] Cross-department query response
17. [ ] Admin document management interface
18. [ ] Student chat interface
19. [ ] Formatted response example
20. [ ] Error handling example
21. [ ] System performance metrics
22. [ ] Any additional notable findings

### Screenshot Requirements
- **Format**: PNG or JPG
- **Resolution**: Minimum 1280x720
- **Naming**: Use descriptive names (e.g., `test_case_3_1_basic_query.png`)
- **Content**: Include full browser window where relevant
- **Annotations**: Add brief annotations if needed to highlight key elements

---

## 📝 Results Documentation Template

### Test Execution Summary
- **Date of Testing**: [Date]
- **Tester Name**: [Name]
- **Environment**: [Local/Dev/Staging]
- **Documents Tested**: [Number/20]
- **Total Test Cases**: [Number]
- **Passed**: [Number]
- **Failed**: [Number]
- **Issues Found**: [Number]

### Detailed Test Results

| Test Case ID | Description | Status | Screenshot | Notes |
|--------------|-------------|--------|------------|-------|
| 1.1 | PDF Document Upload | ✅/❌ | [Link] | [Comments] |
| 1.2 | DOCX Document Upload | ✅/❌ | [Link] | [Comments] |
| 1.3 | CSV Document Upload | ✅/❌ | [Link] | [Comments] |
| ... | ... | ... | ... | ... |

### Performance Metrics
- **Average Upload Time**: [Time]
- **Average Indexing Time**: [Time]
- **Average Query Response Time**: [Time]
- **System Uptime**: [Percentage]
- **Memory Usage**: [Amount]

### Issues & Bugs Found
1. **[Issue Title]**
   - **Severity**: [High/Medium/Low]
   - **Description**: [Details]
   - **Steps to Reproduce**: [Steps]
   - **Screenshot**: [Link]

### Recommendations
1. [Improvement suggestion]
2. [Enhancement idea]
3. [Bug fix recommendation]

---

## ✅ Completion Checklist

### Pre-Testing
- [ ] Access to admin account confirmed
- [ ] Backend server running (http://localhost:8002)
- [ ] Frontend server running (http://localhost:3000)
- [ ] Database connection verified
- [ ] 20 test documents prepared
- [ ] Screenshot tool ready

### Testing Phase
- [ ] All upload test cases completed
- [ ] All indexing test cases completed
- [ ] All query test cases completed
- [ ] All UI test cases completed
- [ ] All edge case test cases completed
- [ ] Screenshots captured for all required cases
- [ ] Performance metrics recorded

### Post-Testing
- [ ] All screenshots organized and named
- [ ] Test results documented in template
- [ ] Issues logged with appropriate severity
- [ ] Recommendations written
- [ ] Final report prepared
- [ ] Results reviewed with team lead

---

## 🔧 Technical Details

### Test Environment
- **Backend URL**: http://localhost:8002
- **Frontend URL**: http://localhost:3000
- **API Documentation**: http://localhost:8002/docs
- **AI Health Check**: http://localhost:8002/api/ai/health
- **Admin Credentials**: [Provide if different from default]

### Test Documents
- **Total Documents**: 20
- **File Types**: PDF, DOCX, CSV, TXT, MD
- **Size Range**: [Min] - [Max] MB
- **Content Areas**: [Academic policies, Course info, etc.]

### API Endpoints for Testing
- `POST /api/ai/documents/upload` - Document upload
- `GET /api/ai/documents` - List documents
- `GET /api/ai/documents/stats` - Vector store stats
- `POST /api/ai/chat` - Quick chat query
- `POST /api/ai/conversations` - Create conversation
- `POST /api/ai/conversations/{id}/messages` - Send message

---

## 📞 Support & Contact

**Technical Issues**: Contact [Developer Name]  
**Task Clarifications**: Contact [Team Lead]  
**Document Access**: Contact [Admin]  

---

## 📅 Timeline

- **Task Assignment**: [Date]
- **Testing Start**: [Date]
- **Testing Completion**: [Date]
- **Report Submission**: [Date]
- **Review Meeting**: [Date]

---

## 🎯 Success Criteria

This testing task will be considered successful when:
1. ✅ All 20 documents are uploaded and indexed successfully
2. ✅ All test cases are executed with documented results
3. ✅ Required screenshots are captured and organized
4. ✅ Performance metrics are within acceptable ranges
5. ✅ Issues are properly documented with severity levels
6. ✅ Final report is submitted by the deadline
7. ✅ At least one comprehensive test session is completed

---

*Last Updated: 14/08/2026*  
*Version: 1.0*  
*Document Owner: BHANU ASATI*
