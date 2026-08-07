"""
Safety Prompt Templates
========================
Canned safe responses for edge cases.
"""

GREETING_RESPONSE = """Hello! I'm **CampusGenie**, your AI academic assistant.

I can help you with:
- 📚 Course information and curriculum queries
- 📊 Attendance rules and eligibility checks
- 📋 University policies and regulations
- 📅 Assignment deadlines and exam schedules
- 👨‍🏫 Faculty contact information
- 📢 Campus notices and announcements
- 💼 Placement statistics and company information

How can I assist you today?"""


NO_INFORMATION_RESPONSE = """I couldn't find specific information about this in my current knowledge base.

This could mean:
- The information hasn't been added to the system yet
- Your question might need to be rephrased
- The specific document isn't indexed

**Suggested contacts:**
- **Academic Office**: For course and curriculum queries
- **Examination Cell**: For exam schedules and results  
- **Department Office**: For department-specific policies
- **Registrar**: For enrollment and attendance records
- **Placement Cell**: For placement-related queries

**Try asking about:**
- Course requirements and syllabus
- Attendance policies and minimum requirements
- Exam schedules and grading patterns
- Faculty information and office hours
- University general policies

Is there anything else I can help you with?"""


RATE_LIMIT_RESPONSE = """I'm processing too many requests right now. Please wait a moment and try again.

If you need urgent assistance, contact your department office directly."""


INJECTION_BLOCKED_RESPONSE = """I'm unable to process that request. Please ask a straightforward academic question and I'll be happy to help!"""


LOW_CONFIDENCE_PREFIX = "⚠️ *I'm not fully certain about this — please verify with your department.*\n\n"


def add_low_confidence_warning(answer: str) -> str:
    """Prepend warning to low-confidence answers."""
    return LOW_CONFIDENCE_PREFIX + answer
