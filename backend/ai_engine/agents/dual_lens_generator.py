"""
Dual-Lens Response Generator Agent
===================================
Generates responses through two distinct analytical lenses:
  - Lens 1: Document RAG Auditor (Strict Factual Extraction & Policy Citations)
  - Lens 2: Domain Skill Advisor (Strategic Next Steps & Mentorship Guidance)
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from ai_engine.core.config import ai_config
from ai_engine.core.logging import Timer, get_logger
from ai_engine.llm.client import call_llm
from ai_engine.prompts.rag_prompt import build_rag_prompt
from ai_engine.prompts.system_prompt import build_system_prompt
from ai_engine.schemas.agent_state import AgentState
from ai_engine.schemas.intent import IntentType
from ai_engine.skills.domain_skills import get_skill_for_intent


logger = get_logger(__name__)


class DualLensGenerator:
    """Generates and synthesizes responses using the Dual-Lens (RAG Auditor + Domain Skill Advisor) approach."""

    @staticmethod
    def generate_lens1_rag_auditor(state: AgentState) -> Dict[str, Any]:
        """
        Lens 1: Strict Document Auditor Lens.
        Extracts ground-truth facts directly from retrieved documents with source citations.
        """
        user_question = state["user_message"]
        retrieved_docs = state.get("retrieved_documents") or []
        tool_result = state.get("tool_result")
        conversation_history = state.get("conversation_history", [])

        prompt = build_rag_prompt(
            user_question=user_question,
            documents=retrieved_docs,
            tool_result=tool_result,
            conversation_history=conversation_history,
        )

        try:
            llm_result = call_llm(prompt)
            raw_response = llm_result.text
            cleaned = raw_response.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(cleaned)
            return {
                "answer": parsed.get("answer", raw_response),
                "confidence": parsed.get("confidence", 0.8),
                "sources": parsed.get("sources", []),
                "follow_up_questions": parsed.get("follow_up_questions", []),
            }
        except Exception as e:
            logger.warning("dual_lens.lens1_fallback", extra={"error": str(e)})
            sources = list(set(d.metadata.source_file for d in retrieved_docs))
            return {
                "answer": f"According to university records: {user_question}",
                "confidence": 0.7,
                "sources": sources,
                "follow_up_questions": [],
            }

    @staticmethod
    def generate_lens2_skill_advisor(state: AgentState, lens1_facts: str) -> Dict[str, Any]:
        """
        Lens 2: Domain Skill Advisor Lens.
        Applies a specialized Domain Skill (Academic Advisor, Career Strategist, Welfare Counselor)
        to provide strategic guidance and step-by-step recommendations.
        """
        user_question = state["user_message"]
        intent = state.get("intent", IntentType.UNKNOWN)
        user_context = state.get("user_context", {})

        skill = get_skill_for_intent(intent, user_question)
        system_prompt = skill.get_system_prompt(user_context)
        guidance_prompt = skill.generate_advisory_guidance(user_question, lens1_facts)

        full_prompt = f"{system_prompt}\n\n{guidance_prompt}"

        try:
            llm_result = call_llm(full_prompt)
            raw_response = llm_result.text
            return {
                "skill_name": skill.name,
                "advisory_guidance": raw_response.strip(),
            }
        except Exception as e:
            logger.warning("dual_lens.lens2_fallback", extra={"error": str(e)})
            return {
                "skill_name": skill.name,
                "advisory_guidance": "1. Review official requirements on the portal.\n2. Contact your academic advisor for assistance.",
            }

    @classmethod
    def generate_dual_lens_response(cls, state: AgentState) -> Dict[str, Any]:
        """
        Generate both Lens 1 and Lens 2 outputs and synthesize them into a unified response.
        """
        # Lens 1: RAG Document Auditor
        lens1_res = cls.generate_lens1_rag_auditor(state)
        lens1_text = lens1_res["answer"]

        # Lens 2: Domain Skill Advisor
        lens2_res = cls.generate_lens2_skill_advisor(state, lens1_text)
        skill_name = lens2_res["skill_name"]
        lens2_text = lens2_res["advisory_guidance"]

        # Synthesized Dual-Perspective Answer
        combined_answer = f"""{lens1_text}

---

### 💡 {skill_name} Guidance:
{lens2_text}"""

        return {
            "lens1_factual_rag": lens1_text,
            "lens2_strategic_guidance": lens2_text,
            "skill_used": skill_name,
            "combined_answer": combined_answer,
            "confidence": lens1_res["confidence"],
            "sources": lens1_res["sources"],
            "follow_up_questions": lens1_res["follow_up_questions"],
        }
