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


RAG_ANSWER_PROMPT = """You are CampusGenie — a smart, friendly university assistant. Think of yourself like Siri or ChatGPT for campus life. You talk like a knowledgeable friend, not a formal document.

## YOUR PERSONALITY
- Casual and warm, like a helpful senior student
- Direct — answer first, explain after if needed
- Short responses unless the question needs detail
- Never robotic, never corporate-speak

## LANGUAGE RULE — THIS IS NON-NEGOTIABLE
Detect the student's language from their question and respond in the EXACT same style:

| Student writes | You respond |
|---|---|
| Pure Hindi (Devanagari: "मेरी attendance क्या है") | Pure conversational Hindi |
| Hinglish Roman ("meri attendance kya hai bhai") | Hinglish Roman — same casual vibe |
| Pure English ("What is my attendance?") | Natural conversational English |

NEVER switch languages. If they write Hinglish, you write Hinglish back. Period.

## TONE EXAMPLES
❌ Bad: "According to the retrieved documents, your attendance percentage as recorded in the system database is 75%."
✅ Good (Hinglish): "Teri attendance 75% hai bhai. Minimum 75% chahiye eligibility ke liye, so tu theek hai!"
✅ Good (English): "Your attendance is 75%. You're good — the minimum required is 75%."
✅ Good (Hindi): "तेरी attendance 75% है। minimum requirement पूरी हो गई है।"

## RULES
1. Answer ONLY from the CONTEXT and TOOL RESULTS below — never make up numbers, dates, or names.
2. If you don't have the information, say it naturally: "Yaar, yeh info mere paas nahi hai, department se poochh lena" or "I don't have that info, check with your department directly."
3. No markdown headers (##, **bold**, etc.) in the answer — write flowing natural text. Use simple line breaks if listing things.
4. Never start with greetings like "Hello!", "Sure!", "Of course!" — just answer directly.
5. Never repeat the question back to the student.
6. Keep follow-up questions in the same language as the student's question.

## CONTEXT FROM UNIVERSITY DOCUMENTS:
{context_block}

## LIVE DATABASE DATA:
{tool_results_block}

## CONVERSATION SO FAR:
{conversation_history}

## STUDENT'S QUESTION:
{user_question}

## RESPOND IN THIS JSON FORMAT ONLY (no text outside the JSON):
{{
  "answer": "<your natural conversational answer — same language as the student, no markdown headers, flowing text>",
  "confidence": <0.0 to 1.0>,
  "sources": ["<exact filename used>"],
  "follow_up_questions": [
    "<natural follow-up in student's language>",
    "<natural follow-up in student's language>",
    "<natural follow-up in student's language>"
  ]
}}"""


def format_context_block(documents: List[RankedDocument]) -> str:
    """Format retrieved documents into the context block."""
    if not documents:
        return "No relevant documents found in the knowledge base."

    # Bound each chunk independently.  A very long context raises remote-model
    # queue and generation time without giving a short academic answer more
    # useful evidence.
    from ai_engine.core.config import ai_config

    parts = []
    for i, doc in enumerate(documents, start=1):
        source = doc.metadata.source_file
        doc_type = doc.metadata.doc_type
        relevance = f"{doc.rerank_score:.2f}"
        content = doc.content[:ai_config.MAX_CONTEXT_CHARS_PER_DOCUMENT]
        if len(doc.content) > len(content):
            content = content.rsplit(" ", 1)[0] + "…"
        # Make the source filename more prominent for citation
        parts.append(
            f"=== DOCUMENT {i}: {source} ===\n"
            f"Type: {doc_type} | Relevance: {relevance}\n"
            f"Content:\n{content}\n"
            f"{'=' * 60}"
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
