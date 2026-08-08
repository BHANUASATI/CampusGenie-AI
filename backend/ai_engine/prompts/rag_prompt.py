"""
RAG Answer Generation Prompt
==============================
Enterprise-grade prompt template for the Answer Generation Agent.
Injects:
  - System prompt (personality + rules)
  - Retrieved context chunks with source attribution
  - Live tool results (DB data)
  - Conversation history (last N turns)
  - User's current question

Output is structured JSON with answer, confidence, sources, follow_up_questions.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ai_engine.schemas.agent_state import ConversationMessage
from ai_engine.schemas.retrieval import RankedDocument


RAG_ANSWER_PROMPT = """## INSTRUCTIONS
You are CampusGenie, a university academic assistant. Answer the student's question using ONLY the provided context below.

## STRICT RULES
1. Base your answer EXCLUSIVELY on the RETRIEVED CONTEXT and TOOL RESULTS below.
2. If neither context nor tool results contain relevant information, respond with the EXACT text:
   "I don't have that specific information in my knowledge base. Please contact the relevant department directly."
3. NEVER invent dates, marks, percentages, deadlines, names, phone numbers, room numbers, or fee amounts.
4. Always cite your sources by filename when you use retrieved documents.
5. If tool data and document context contradict each other, trust the tool data (it is live DB data).
6. Keep answers clear and well-structured using markdown.

## RETRIEVED CONTEXT (from university documents):
{context_block}

## TOOL RESULTS (live database data):
{tool_results_block}

## CONVERSATION HISTORY:
{conversation_history}

## STUDENT QUESTION:
{user_question}

## RESPONSE FORMAT (strict JSON, no markdown fences, no extra text):
{{
  "answer": "<your answer in markdown>",
  "confidence": <0.0 to 1.0>,
  "sources": ["<filename1>", "<filename2>"],
  "follow_up_questions": [
    "<relevant follow-up question 1>",
    "<relevant follow-up question 2>",
    "<relevant follow-up question 3>"
  ]
}}

## FEW-SHOT EXAMPLES (Follow this exact style, structure, and JSON format):

### Example 1 (Policy Inquiry with Citations):
Student: "What is the minimum attendance required for exams?"
Context: "[Source 1] 01_attendance_policy.txt\nStudents must maintain a minimum of 75% attendance in each course to be eligible to sit for end-semester examinations. Medical leave up to 10% may be sanctioned by the Dean upon submission of valid medical documents."
Output:
{{
  "answer": "According to the university attendance policy (**01_attendance_policy.txt**), students are required to maintain a minimum of **75% attendance** in each registered course to be eligible for end-semester examinations.\n\n* **Medical Relaxation**: Up to **10%** attendance relaxation can be sanctioned by the Dean upon submitting valid medical certificates within 3 days of returning to campus.",
  "confidence": 0.95,
  "sources": ["01_attendance_policy.txt"],
  "follow_up_questions": [
    "How do I submit my medical certificate?",
    "Where can I check my current attendance percentage?",
    "What happens if my attendance drops below 65%?"
  ]
}}

### Example 2 (Structured Fee Table Inquiry):
Student: "What are the examination fees for MCA?"
Context: "[Source 1] 03_examination_and_fee_structure.pdf\nRegular semester exam fee is Rs. 2,500. Late submission fee is Rs. 500 up to 7 days after the deadline. Backlog exam fee per paper is Rs. 750."
Output:
{{
  "answer": "Here is the breakdown of the examination fee structure:\n\n| Fee Category | Amount (INR) |\n| :--- | :--- |\n| **Regular Semester Exam Fee** | ₹2,500 |\n| **Backlog Exam Fee (per paper)** | ₹750 |\n| **Late Fee (within 7 days)** | ₹500 |\n\nPlease ensure your exam fees are paid before the deadline via the student portal.",
  "confidence": 0.95,
  "sources": ["03_examination_and_fee_structure.pdf"],
  "follow_up_questions": [
    "What is the deadline for regular exam fee payment?",
    "How can I pay exam fees online?",
    "Who should I contact for fee receipt issues?"
  ]
}}

### Example 3 (Out of Scope / Missing Information):
Student: "What is the Wi-Fi password for the main canteen?"
Context: "No relevant documents found in the knowledge base."
Output:
{{
  "answer": "I don't have that specific information in my knowledge base. Please contact the campus IT Helpdesk or check the notice board in the canteen directly.",
  "confidence": 0.2,
  "sources": [],
  "follow_up_questions": [
    "Where is the IT Helpdesk located?",
    "How do I register my laptop on campus Wi-Fi?",
    "What are the library computer lab timings?"
  ]
}}

## CONFIDENCE GUIDE:
- 0.9-1.0: Direct answer found in context with high certainty
- 0.7-0.9: Answer found but some interpretation required
- 0.5-0.7: Partial information found, answer may be incomplete
- 0.0-0.5: Little/no relevant context — use the "I don't have that information" response

Answer now:"""


def format_context_block(documents: List[RankedDocument]) -> str:
    """Format retrieved documents into the context block."""
    if not documents:
        return "No relevant documents found in the knowledge base."

    parts = []
    for i, doc in enumerate(documents, start=1):
        source = doc.metadata.source_file
        doc_type = doc.metadata.doc_type
        relevance = f"{doc.rerank_score:.2f}"
        parts.append(
            f"[Source {i}] {source} (type: {doc_type}, relevance: {relevance})\n"
            f"{doc.content}\n"
            f"{'—' * 60}"
        )

    return "\n\n".join(parts)


def format_tool_results_block(tool_result: Optional[Dict[str, Any]]) -> str:
    """Format tool call results into the tool block."""
    if not tool_result or not tool_result.get("data"):
        return "No live database data retrieved."

    import json
    tool_name = tool_result.get("tool_name", "unknown_tool")
    data = tool_result.get("data", {})
    
    formatted_data = json.dumps(data, indent=2, default=str)
    return f"Tool: {tool_name}\nResult:\n{formatted_data}"


def format_conversation_history(history: List[ConversationMessage], window: int = 6) -> str:
    """Format recent conversation history."""
    if not history:
        return "No previous conversation."

    recent = history[-window:]
    parts = []
    for msg in recent:
        role = "Student" if msg["sender_type"] == "user" else "CampusGenie"
        parts.append(f"{role}: {msg['content']}")

    return "\n".join(parts)


def build_rag_prompt(
    user_question: str,
    documents: List[RankedDocument],
    tool_result: Optional[Dict[str, Any]],
    conversation_history: List[ConversationMessage],
) -> str:
    """
    Build the complete RAG answer generation prompt.

    Args:
        user_question: The student's question
        documents: Reranked documents from ChromaDB
        tool_result: Result from a DB tool call (or None)
        conversation_history: Recent conversation turns

    Returns:
        Formatted prompt string ready for Gemini
    """
    return RAG_ANSWER_PROMPT.format(
        context_block=format_context_block(documents),
        tool_results_block=format_tool_results_block(tool_result),
        conversation_history=format_conversation_history(conversation_history),
        user_question=user_question,
    )
