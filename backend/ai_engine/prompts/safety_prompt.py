"""
Safety Prompt Templates
========================
Canned safe responses for edge cases.
"""

GREETING_RESPONSE = """Hello! I'm **CampusGenie**, your AI academic assistant. 👋

How can I help you today?"""


NO_INFORMATION_RESPONSE = """Yaar, yeh specific info mere paas nahi hai abhi. Department se directly poochh lena ya notice board check kar — wahan accurate milega.

(If you prefer English: I don't have that info in my knowledge base right now. Check with your department directly for accurate details.)"""

NO_INFORMATION_RESPONSE_EN = (
    "I don't have that information in the university documents. "
    "Please check with your department directly for the latest update."
)

_HINGLISH_NO_INFO_MARKERS = frozenset({
    "kya", "hai", "ka", "ki", "ke", "ko", "kaise", "kitna", "kitni",
    "kab", "chahiye", "batao", "bhai", "yaar", "nahi", "nhi", "mein",
})


def no_information_response(question: str = "") -> str:
    """Return a no-answer message in the same language as the question."""
    if any("\u0900" <= ch <= "\u097F" for ch in question):
        return NO_INFORMATION_RESPONSE
    words = {word for word in question.lower().replace("?", " ").split()}
    if words & _HINGLISH_NO_INFO_MARKERS:
        return NO_INFORMATION_RESPONSE
    return NO_INFORMATION_RESPONSE_EN


RATE_LIMIT_RESPONSE = """I'm processing too many requests right now. Please wait a moment and try again.

If you need urgent assistance, contact your department office directly."""


INJECTION_BLOCKED_RESPONSE = """I'm unable to process that request. Please ask a straightforward academic question and I'll be happy to help!"""


LOW_CONFIDENCE_PREFIX = "⚠️ *I'm not fully certain about this — please verify with your department.*\n\n"


def add_low_confidence_warning(answer: str) -> str:
    """Prepend warning to low-confidence answers."""
    return LOW_CONFIDENCE_PREFIX + answer
