"""
Conversation Repository
========================
All database access for AIConversation and AIMessage models.
No SQL outside this file — agents call this, not the DB directly.
"""

from __future__ import annotations

import sys
import os
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

# Ensure src/ is importable
_SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "src")
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

from ai_engine.core.logging import get_logger

logger = get_logger(__name__)


class ConversationRepository:
    """Repository for AIConversation and AIMessage DB operations."""

    def __init__(self, db: "Session"):
        self.db = db

    # -----------------------------------------------------------------------
    # Conversations
    # -----------------------------------------------------------------------

    def create_conversation(self, user_id: int, title: str = None) -> "AIConversation":
        from models import AIConversation
        now = datetime.utcnow()
        conv = AIConversation(
            user_id=user_id,
            title=title or f"Conversation {now.strftime('%Y-%m-%d %H:%M')}",
            created_at=now,
            updated_at=now,
        )
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        logger.info(
            "repo.conversation.created",
            extra={"conversation_id": conv.id, "user_id": user_id},
        )
        return conv

    def get_conversation(
        self, conversation_id: int, user_id: int
    ) -> Optional["AIConversation"]:
        from models import AIConversation
        return (
            self.db.query(AIConversation)
            .filter(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id,
            )
            .first()
        )

    def get_user_conversations(self, user_id: int) -> List["AIConversation"]:
        from models import AIConversation
        return (
            self.db.query(AIConversation)
            .filter(AIConversation.user_id == user_id)
            .order_by(AIConversation.updated_at.desc())
            .all()
        )

    def delete_conversation(self, conversation_id: int, user_id: int) -> bool:
        from models import AIConversation, AIMessage
        conv = self.get_conversation(conversation_id, user_id)
        if not conv:
            return False
        self.db.query(AIMessage).filter(
            AIMessage.conversation_id == conversation_id
        ).delete()
        self.db.delete(conv)
        self.db.commit()
        logger.info(
            "repo.conversation.deleted",
            extra={"conversation_id": conversation_id},
        )
        return True

    # -----------------------------------------------------------------------
    # Messages
    # -----------------------------------------------------------------------

    def get_messages(
        self, conversation_id: int, limit: int = 20
    ) -> List["AIMessage"]:
        from models import AIMessage
        return (
            self.db.query(AIMessage)
            .filter(AIMessage.conversation_id == conversation_id)
            .order_by(AIMessage.created_at.asc())
            .limit(limit)
            .all()
        )

    def add_message(
        self,
        conversation_id: int,
        content: str,
        sender_type: str,
    ) -> "AIMessage":
        from models import AIMessage, MessageSenderType
        # Accept both "user"/"ai" strings and enum values
        if isinstance(sender_type, str):
            sender_type_enum = MessageSenderType(sender_type)
        else:
            sender_type_enum = sender_type
        msg = AIMessage(
            conversation_id=conversation_id,
            content=content,
            sender_type=sender_type_enum,
            created_at=datetime.utcnow(),
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def get_last_n_messages(
        self, conversation_id: int, n: int
    ) -> List["AIMessage"]:
        from models import AIMessage
        messages = (
            self.db.query(AIMessage)
            .filter(AIMessage.conversation_id == conversation_id)
            .order_by(AIMessage.created_at.desc())
            .limit(n)
            .all()
        )
        messages.reverse()
        return messages
