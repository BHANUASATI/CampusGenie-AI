"""
Domain Skills Module
====================
Specialized AI advisor skills representing Domain Expert Perspectives (Lens 2).
"""

from __future__ import annotations

from typing import Dict, Any, Optional
from ai_engine.schemas.intent import IntentType


class BaseDomainSkill:
    """Base class for specialized AI Domain Advisor Skills."""

    name: str = "General Academic Advisor"
    description: str = "General student academic and campus guidance"

    def get_system_prompt(self, user_context: Dict[str, Any]) -> str:
        """Returns specialized system prompt instructions for this domain skill."""
        return f"""You are acting as an expert **{self.name}** at the university.
Your goal is to provide strategic, actionable, and empathetic advice to help students succeed.

### Advisor Principles:
1. Provide actionable next steps (e.g. step 1, step 2, step 3).
2. Highlight important deadline risks, eligibility thresholds, or academic implications.
3. Offer constructive suggestions, study tips, or administrative guidance tailored to the student's background.
4. Maintain a warm, encouraging, professional mentor tone.
"""

    def generate_advisory_guidance(self, query: str, retrieved_facts: str) -> str:
        """Construct prompt instructions for this specific domain skill."""
        return f"""As an expert **{self.name}**, analyze the student's question and relevant facts:

### Query: {query}
### Retained Document Facts: {retrieved_facts or 'General university guidance'}

Provide structured, high-value advisor recommendations including:
- **Strategic Implications**: What this means for the student's academic/career progress.
- **Actionable Steps**: 3 clear steps the student should take next.
- **Support Contacts**: Which office or coordinator to reach out to.
"""


class AcademicPolicySkill(BaseDomainSkill):
    """Specialized skill for academic regulations, attendance math, GPA, and course planning."""

    name = "Academic & Curriculum Strategist"
    description = "Specialized advisor for attendance calculations, grading, credit planning, and exam eligibility"

    def get_system_prompt(self, user_context: Dict[str, Any]) -> str:
        base = super().get_system_prompt(user_context)
        return base + """
### Academic Focus Areas:
- Attendance percentage impact & medical waiver application steps.
- Exam eligibility criteria & backlog clearance strategies.
- CGPA/SGPA optimization and credit requirement planning.
"""


class CareerPlacementSkill(BaseDomainSkill):
    """Specialized skill for placement eligibility, resume strategy, and career guidance."""

    name = "Career Development & Placement Coach"
    description = "Specialized advisor for placement eligibility, company drives, resume building, and interview prep"

    def get_system_prompt(self, user_context: Dict[str, Any]) -> str:
        base = super().get_system_prompt(user_context)
        return base + """
### Career & Placement Focus Areas:
- Placement drive eligibility rules (CGPA cutoffs, backlog limits).
- Resume building, technical preparation, and mock interview practice.
- Training & Placement Cell (TPC) registration timelines and company policies.
"""


class StudentWelfareSkill(BaseDomainSkill):
    """Specialized skill for hostel rules, library services, student safety, and welfare."""

    name = "Student Welfare & Campus Life Counselor"
    description = "Specialized advisor for hostel rules, library access, student rights, and campus safety"

    def get_system_prompt(self, user_context: Dict[str, Any]) -> str:
        base = super().get_system_prompt(user_context)
        return base + """
### Welfare Focus Areas:
- Hostel curfew rules, leave permission processes, and warden escalations.
- Library access, digital resources, and study room reservations.
- Anti-ragging protection, zero-tolerance policy, and student grievance pathways.
"""


def get_skill_for_intent(intent: IntentType, query: str) -> BaseDomainSkill:
    """
    Select the appropriate specialized Domain Skill based on intent and query keywords.
    """
    q_lower = query.lower()

    if any(w in q_lower for w in ["placement", "job", "company", "interview", "resume", "ctc", "internship", "tpc"]):
        return CareerPlacementSkill()

    if any(w in q_lower for w in ["hostel", "warden", "curfew", "mess", "library", "book", "ragging", "complaint", "discipline"]):
        return StudentWelfareSkill()

    if intent in [IntentType.ATTENDANCE, IntentType.EXAMINATION, IntentType.ACADEMIC_CALENDAR, IntentType.COURSE_INFO] or any(w in q_lower for w in ["attendance", "exam", "grade", "cgpa", "sgpa", "fee", "marks"]):
        return AcademicPolicySkill()

    return BaseDomainSkill()
