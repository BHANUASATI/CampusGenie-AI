"""
Chat Service
=============
The main entry point for the AI engine from FastAPI routes.

Responsibilities:
  1. Security gate (rate limit + injection scan + PII masking)
  2. Build the initial AgentState
  3. Run the LangGraph orchestrator
  4. Return the final AgentResponse + persisted DB message objects

This is the ONLY file FastAPI routes should import from the AI engine.
"""

from __future__ import annotations

import sys
import os
import uuid
from datetime import datetime
from typing import Any, Dict, Optional, Tuple, TYPE_CHECKING

from ai_engine.core.config import ai_config
from ai_engine.core.exceptions import (
    PromptInjectionDetected,
    RateLimitExceeded,
)
from ai_engine.core.logging import Timer, get_logger, trace_context
from ai_engine.core.security import mask_pii, rate_limiter, validate_and_clean_input
from ai_engine.graph.orchestrator import run_agent
from ai_engine.repositories.conversation_repo import ConversationRepository
from ai_engine.schemas.agent_state import AgentState, UserContext
from ai_engine.schemas.response import AgentResponse

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

_SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "src")
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

logger = get_logger(__name__)


def _build_user_context(current_user) -> UserContext:
    """Build a UserContext dict from the SQLAlchemy User object."""
    ctx: UserContext = {
        "user_id": current_user.id,
        "role": str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        "name": str(current_user.email),  # fallback, enriched below
        "department": None,
        "semester": None,
        "student_id": None,
        "enrollment_number": None,
    }

    # Enrich with student profile if available
    if hasattr(current_user, 'student') and current_user.student:
        student = current_user.student
        ctx["name"] = f"{student.first_name} {student.last_name}"
        ctx["student_id"] = student.id
        ctx["enrollment_number"] = student.enrollment_number
        ctx["semester"] = student.semester

        if student.department:
            ctx["department"] = student.department.name

    # Enrich with faculty profile if available
    elif hasattr(current_user, 'faculty') and current_user.faculty:
        faculty = current_user.faculty
        ctx["name"] = f"{faculty.first_name} {faculty.last_name}"
        if faculty.department:
            ctx["department"] = faculty.department.name

    return ctx


class ChatService:
    """Main chat service — called by FastAPI route handlers."""

    def __init__(self, db: "Session"):
        self.db = db
        self.conv_repo = ConversationRepository(db)

    def send_message(
        self,
        conversation_id: int,
        message: str,
        current_user,
    ) -> Tuple["AIMessage", "AIMessage", AgentResponse]:
        """
        Process a chat message through the full AI pipeline.

        Args:
            conversation_id: DB conversation ID
            message: Raw user message
            current_user: SQLAlchemy User object from JWT

        Returns:
            Tuple of (user_db_message, ai_db_message, agent_response)

        Raises:
            RateLimitExceeded: if user is rate limited
            PromptInjectionDetected: if injection is detected
            ValueError: if conversation not found
        """
        user_id = current_user.id

        with Timer() as total_timer:
            with trace_context(user_id=user_id) as trace_id:

                # -----------------------------------------------------------
                # 1. Security gate
                # -----------------------------------------------------------
                rate_limiter.check_and_consume(user_id)

                cleaned_message = validate_and_clean_input(user_id, message)
                masked_message, pii_found = mask_pii(cleaned_message)

                if pii_found:
                    logger.warning(
                        "chat.pii_masked",
                        extra={"user_id": user_id, "pii_types": pii_found},
                    )

                # -----------------------------------------------------------
                # 2. Build user context
                # -----------------------------------------------------------
                user_context = _build_user_context(current_user)

                # -----------------------------------------------------------
                # 3. Build initial AgentState
                # -----------------------------------------------------------
                initial_state: AgentState = {
                    "user_message": masked_message,
                    "conversation_id": conversation_id,
                    "user_context": user_context,
                    "trace_id": trace_id,
                    # Fields populated by nodes:
                    "conversation_history": [],
                    "session_memory": {},
                    "classification": None,
                    "intent": None,
                    "intent_confidence": None,
                    "needs_retrieval": None,
                    "needs_tool": None,
                    "suggested_tool": None,
                    "retrieval_query": None,
                    "retrieval_result": None,
                    "retrieved_documents": None,
                    "tool_result": None,
                    "agent_response": None,
                    "memory_saved": None,
                    "error": None,
                    "execution_trace": [],
                }

                # -----------------------------------------------------------
                # 4. Run the LangGraph
                # -----------------------------------------------------------
                final_state = run_agent(initial_state, self.db)

                # -----------------------------------------------------------
                # 5. Extract results
                # -----------------------------------------------------------
                agent_response: AgentResponse = final_state.get("agent_response")

                if agent_response is None:
                    # Should never happen — generate_answer always returns a response
                    from ai_engine.prompts.safety_prompt import NO_INFORMATION_RESPONSE
                    from ai_engine.schemas.response import AgentResponse as AR
                    agent_response = AR(
                        answer=NO_INFORMATION_RESPONSE,
                        confidence=0.0,
                        sources=[],
                        follow_up_questions=[],
                    )

                # -----------------------------------------------------------
                # 6. Retrieve the persisted messages from save_memory_node
                # -----------------------------------------------------------
                # save_memory_node wrote them to DB; we need to return the
                # actual DB objects for the API response.
                # We fetch them by getting the last 2 messages for this conversation.
                from models import AIMessage
                last_two = (
                    self.db.query(AIMessage)
                    .filter(AIMessage.conversation_id == conversation_id)
                    .order_by(AIMessage.created_at.desc())
                    .limit(2)
                    .all()
                )
                last_two.reverse()

                if len(last_two) >= 2:
                    user_db_msg = last_two[-2]
                    ai_db_msg = last_two[-1]
                else:
                    # Fallback: create in-memory objects (not persisted)
                    # Import here to avoid top-level circular dependency
                    from models import AIMessage, MessageSenderType
                    now = datetime.utcnow()
                    user_db_msg = AIMessage(
                        id=0,
                        conversation_id=conversation_id,
                        content=cleaned_message,
                        sender_type=MessageSenderType.USER,
                        created_at=now,
                    )
                    ai_db_msg = AIMessage(
                        id=0,
                        conversation_id=conversation_id,
                        content=agent_response.answer,
                        sender_type=MessageSenderType.AI,
                        created_at=now,
                    )

        logger.info(
            "chat.service.done",
            extra={
                "user_id": user_id,
                "conversation_id": conversation_id,
                "total_ms": total_timer.elapsed_ms,
                "intent": str(final_state.get("intent", "unknown")),
                "confidence": getattr(agent_response, "confidence", 0.0),
                "trace_id": trace_id,
            },
        )

        return user_db_msg, ai_db_msg, agent_response

    def create_conversation(self, user_id: int, title: str = None):
        """Create a new conversation in the database."""
        return self.conv_repo.create_conversation(user_id, title)

    def get_conversations(self, user_id: int):
        """List all conversations for a user."""
        return self.conv_repo.get_user_conversations(user_id)

    def get_conversation_with_messages(self, conversation_id: int, user_id: int) -> Optional[dict]:
        """Get a conversation with all its messages."""
        conv = self.conv_repo.get_conversation(conversation_id, user_id)
        if not conv:
            return None
        messages = self.conv_repo.get_messages(conversation_id, limit=100)
        return {"conversation": conv, "messages": messages}

    def delete_conversation(self, conversation_id: int, user_id: int) -> bool:
        """Delete a conversation and all its messages."""
        return self.conv_repo.delete_conversation(conversation_id, user_id)
