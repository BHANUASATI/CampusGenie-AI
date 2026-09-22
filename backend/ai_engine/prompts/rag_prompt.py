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
4. ALWAYS cite your sources by including the EXACT filename from the retrieved context in your answer.
5. If tool data and document context contradict each other, trust the tool data (it is live DB data).
6. Keep the text INSIDE the `answer` JSON field clear and well-structured using markdown (headings, bullets, bold). Do NOT output markdown outside the JSON object.
7. NEVER begin your answer with a greeting, self-introduction, or phrases like "Hello", "Hi", "Sure!", "Of course!", "As CampusGenie..." or "I'm happy to help". Jump straight into the answer.
8. NEVER repeat or re-state the student's question before answering it.
9. The `answer` field must contain ONLY the direct answer content. Do NOT embed confidence scores or suggested questions inside the answer text — they are separate JSON fields.
10. Follow-up questions MUST be directly relevant to the specific question asked. Never generate generic suggestions like "Who is my faculty advisor?" or "What courses am I enrolled in?" unless the student's question is specifically about those topics.
11. NEVER explain your reasoning or describe what the documents/context contain (e.g. "Document 5 mentions...", "The context shows...", "Wait, the retrieved text says..."). Output the answer directly, as if you already know it.
12. The "I don't have that specific information..." response (rule 2) is the LAST resort. ONLY use it when the retrieved context contains NOTHING relevant to the question. If ANY retrieved document partially or fully covers the topic, answer from it — even a partial grounded answer is better than a refusal. Do not refuse because the exact phrase you were looking for is missing.

## RESPONSE STRUCTURE (follow this order inside the `answer` field):
1. Direct answer / key fact (one or two sentences at most)
2. Supporting explanation or details (use bullet points or short paragraphs)
3. Important caveats or warnings in bold if applicable
4. Source citation (e.g. "According to [filename]...")
5. If multiple sources are used, cite all relevant filenames

## RETRIEVED CONTEXT (from university documents):
{context_block}

## TOOL RESULTS (live database data):
{tool_results_block}

## CONVERSATION HISTORY:
{conversation_history}

## STUDENT QUESTION:
{user_question}

## RESPONSE FORMAT — OUTPUT ONLY THE JSON OBJECT BELOW:
Your entire reply MUST be a single valid JSON object. Do not output any text, explanation, or markdown fences before or after it.
{{
  "answer": "<your answer in markdown — no greeting, no self-introduction, answer first. MUST include source citations like 'According to [filename]' when using document content>",
  "confidence": <0.0 to 1.0>,
  "sources": ["<EXACT filename1 from context>", "<EXACT filename2 from context>"],
  "follow_up_questions": [
    "<follow-up question directly related to THIS specific question>",
    "<follow-up question directly related to THIS specific question>",
    "<follow-up question directly related to THIS specific question>"
  ]
}}

## CONFIDENCE GUIDE:
- 0.9-1.0: Direct answer found in context with high certainty
- 0.7-0.9: Answer found but some interpretation required
- 0.5-0.7: Partial information found, answer may be incomplete
- 0.0-0.5: Little/no relevant context — use the "I don't have that information" response

## SOURCE CITATION REQUIREMENTS:
- You MUST include ALL filenames from the retrieved context that you use in your answer
- Source filenames must match EXACTLY as shown in the retrieved context
- Format: "According to [filename]" or "As stated in [filename]"
- If you use information from multiple documents, cite all of them

Answer now:"""


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
