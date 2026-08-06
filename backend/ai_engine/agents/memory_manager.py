"""
Memory Manager Agent
=====================
Handles loading and saving conversation history.

load_memory_node:
  - Reads last N turns from the database
  - Populates state.conversation_history

save_memory_node:
  - Persists both user_message and ai_message to DB
  - Updates conversation.updated_at
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from ai_engine.core.config import ai_config
from ai_engine.core.exceptions import MemoryError as AIMemoryError
from ai_engine.core.logging import get_logger
from ai_engine.schemas.agent_state import AgentState, ConversationMessage

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = get_logger(__name__)


def load_memory_node(state: AgentState, db: "Session") -> AgentState:
    """
    LangGraph node: Load conversation memory from database.

    Reads the last MEMORY_WINDOW_SIZE turns for the conversation
    and populates state.conversation_history.

    Args:
        state: Current agent state
        db: SQLAlchemy database session

    Returns:
        Updated state with conversation_history populated
    """
    conversation_id = state["conversation_id"]
    trace_id = state.get("trace_id", "")

    logger.info(
        "memory.load.start",
        extra={
            "event": "memory.load.start",
            "conversation_id": conversation_id,
            "trace_id": trace_id,
        },
    )

    try:
        # Import here to avoid circular imports with src/ models
        import sys
        import os
        # Ensure src directory is on path
        src_dir = os.path.join(os.path.dirname(__file__), "..", "..", "src")
        if src_dir not in sys.path:
            sys.path.insert(0, src_dir)

        from models import AIMessage, MessageSenderType

        messages = (
            db.query(AIMessage)
            .filter(AIMessage.conversation_id == conversation_id)
            .order_by(AIMessage.created_at.desc())
            .limit(ai_config.MEMORY_WINDOW_SIZE * 2)  # *2 because each turn = user + ai
            .all()
        )

        # Reverse to chronological order, convert to ConversationMessage
        messages.reverse()
        history: list[ConversationMessage] = [
            {
                "sender_type": (
                    msg.sender_type.value
                    if hasattr(msg.sender_type, 'value')
                    else str(msg.sender_type)
                ),
                "content": msg.content,
            }
            for msg in messages
        ]

        logger.info(
            "memory.load.done",
            extra={
                "event": "memory.load.done",
                "conversation_id": conversation_id,
                "turns_loaded": len(history),
                "trace_id": trace_id,
            },
        )

        return {
            **state,
            "conversation_history": history,
            "session_memory": {},
            "execution_trace": state.get("execution_trace", []) + ["load_memory"],
        }

    except Exception as e:
        logger.error(
            "memory.load.failed",
            extra={"error": str(e), "conversation_id": conversation_id},
        )
        # Non-fatal: proceed with empty history
        return {
            **state,
            "conversation_history": [],
            "session_memory": {},
            "execution_trace": state.get("execution_trace", []) + ["load_memory(empty)"],
        }


def save_memory_node(state: AgentState, db: "Session") -> AgentState:
    """
    LangGraph node: Save conversation to database.

    Saves both the user message and AI response as AIMessage records,
    and updates the conversation's updated_at timestamp.

    Args:
        state: Current agent state (must have agent_response populated)
        db: SQLAlchemy database session

    Returns:
        Updated state with memory_saved = True
    """
    conversation_id = state["conversation_id"]
    user_message = state["user_message"]
    agent_response = state.get("agent_response")
    trace_id = state.get("trace_id", "")

    logger.info(
        "memory.save.start",
        extra={
            "event": "memory.save.start",
            "conversation_id": conversation_id,
            "trace_id": trace_id,
        },
    )

    try:
        import sys
        import os
        src_dir = os.path.join(os.path.dirname(__file__), "..", "..", "src")
        if src_dir not in sys.path:
            sys.path.insert(0, src_dir)

        from models import AIConversation, AIMessage, MessageSenderType

        # Save user message
        user_msg = AIMessage(
            conversation_id=conversation_id,
            content=user_message,
            sender_type=MessageSenderType.USER,
            created_at=datetime.utcnow(),
        )
        db.add(user_msg)

        # Build AI answer text
        if agent_response:
            answer_text = agent_response.answer
        else:
            answer_text = "I'm sorry, I encountered an error. Please try again."

        # Save AI message
        ai_msg = AIMessage(
            conversation_id=conversation_id,
            content=answer_text,
            sender_type=MessageSenderType.AI,
            created_at=datetime.utcnow(),
        )
        db.add(ai_msg)

        # Update conversation timestamp
        conversation = db.query(AIConversation).filter(
            AIConversation.id == conversation_id
        ).first()
        if conversation:
            conversation.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(user_msg)
        db.refresh(ai_msg)

        logger.info(
            "memory.save.done",
            extra={
                "event": "memory.save.done",
                "conversation_id": conversation_id,
                "user_msg_id": user_msg.id,
                "ai_msg_id": ai_msg.id,
                "trace_id": trace_id,
            },
        )

        return {
            **state,
            "memory_saved": True,
            "_saved_user_msg": user_msg,
            "_saved_ai_msg": ai_msg,
            "execution_trace": state.get("execution_trace", []) + ["save_memory"],
        }

    except Exception as e:
        logger.error(
            "memory.save.failed",
            extra={"error": str(e), "conversation_id": conversation_id},
        )
        db.rollback()
        return {
            **state,
            "memory_saved": False,
            "execution_trace": state.get("execution_trace", []) + ["save_memory(failed)"],
        }
