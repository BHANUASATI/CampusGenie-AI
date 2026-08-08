"""
Domain Skills Package
=====================
Specialized domain expert prompts and advisors for CampusGenie AI.
"""

from .domain_skills import (
    AcademicPolicySkill,
    CareerPlacementSkill,
    StudentWelfareSkill,
    get_skill_for_intent,
)

__all__ = [
    "AcademicPolicySkill",
    "CareerPlacementSkill",
    "StudentWelfareSkill",
    "get_skill_for_intent",
]
