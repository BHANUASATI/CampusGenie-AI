"""
Safety Prompt Templates
========================
Canned safe responses for edge cases.
"""

GREETING_RESPONSE = """Hello! I'm **CampusGenie**, your AI academic assistant. 👋

How can I help you today?"""


NO_INFORMATION_RESPONSE = """Yaar, yeh specific info mere paas nahi hai abhi. Department se directly poochh lena ya notice board check kar — wahan accurate milega.

(If you prefer English: I don't have that info in my knowledge base right now. Check with your department directly for accurate details.)"""


RATE_LIMIT_RESPONSE = """I'm processing too many requests right now. Please wait a moment and try again.

If you need urgent assistance, contact your department office directly."""


INJECTION_BLOCKED_RESPONSE = """I'm unable to process that request. Please ask a straightforward academic question and I'll be happy to help!"""


LOW_CONFIDENCE_PREFIX = "⚠️ *I'm not fully certain about this — please verify with your department.*\n\n"


def add_low_confidence_warning(answer: str) -> str:
    """Prepend warning to low-confidence answers."""
    return LOW_CONFIDENCE_PREFIX + answer
