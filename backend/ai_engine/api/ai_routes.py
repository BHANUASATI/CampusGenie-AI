"""
AI Assistant Routes (Replacement for src/ai_assistant_routes.py)
==================================================================
FastAPI router that preserves the EXACT API contract the frontend expects.

Endpoints:
  POST   /api/ai/conversations                    — create conversation
  GET    /api/ai/conversations                    — list user conversations
  GET    /api/ai/conversations/{id}               — get conversation + messages
  POST   /api/ai/conversations/{id}/messages      — send message (MAIN)
  DELETE /api/ai/conversations/{id}               — delete conversation
  POST   /api/ai/chat                             — quick chat (stateless)

All existing schemas (AIConversationResponse, AIChatResponse, etc.) are reused.
The frontend does NOT need to change a single line.
"""

from __future__ import annotations

import sys
import os
from datetime import datetime
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

_SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "src")
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

import models, schemas
from database import get_db
from dependencies import get_current_user

from ai_engine.core.exceptions import AIEngineError, PromptInjectionDetected, RateLimitExceeded
from ai_engine.core.logging import get_logger
from ai_engine.services.chat_service import ChatService

logger = get_logger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

@router.post("/conversations", response_model=schemas.AIConversationResponse)
async def create_conversation(
    conversation_data: schemas.AIConversationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new AI conversation."""
    if current_user.role != models.UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create AI conversations",
        )

    service = ChatService(db)
    conversation = service.create_conversation(
        user_id=current_user.id,
        title=conversation_data.title,
    )
    return conversation


@router.get("/conversations", response_model=List[schemas.AIConversationResponse])
async def get_conversations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all conversations for the current user."""
    if current_user.role != models.UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access AI conversations",
        )

    service = ChatService(db)
    conversations = service.get_conversations(current_user.id)
    return conversations


@router.get("/conversations/{conversation_id}", response_model=schemas.AIConversationDetailResponse)
async def get_conversation(
    conversation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific conversation with all messages."""
    if current_user.role != models.UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access AI conversations",
        )

    service = ChatService(db)
    result = service.get_conversation_with_messages(conversation_id, current_user.id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return {
        "id": result["conversation"].id,
        "title": result["conversation"].title,
        "created_at": result["conversation"].created_at,
        "updated_at": result["conversation"].updated_at,
        "messages": result["messages"],
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a conversation."""
    if current_user.role != models.UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can delete AI conversations",
        )

    service = ChatService(db)
    success = service.delete_conversation(conversation_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return {"message": "Conversation deleted successfully"}


# ---------------------------------------------------------------------------
# Chat (Main Endpoint)
# ---------------------------------------------------------------------------

@router.post("/conversations/{conversation_id}/messages", response_model=schemas.AIChatResponse)
async def send_message(
    conversation_id: int,
    message_data: schemas.AIMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send a message and get AI response.
    
    This is the MAIN endpoint the frontend calls.
    The entire LangGraph execution happens here.
    """
    if current_user.role != models.UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can send messages to AI",
        )

    # Verify conversation belongs to user
    service = ChatService(db)
    conv = db.query(models.AIConversation).filter(
        models.AIConversation.id == conversation_id,
        models.AIConversation.user_id == current_user.id,
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Run the full AI pipeline
    try:
        user_msg, ai_msg, agent_response = service.send_message(
            conversation_id=conversation_id,
            message=message_data.content,
            current_user=current_user,
        )
    except RateLimitExceeded as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        )
    except PromptInjectionDetected as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except AIEngineError as e:
        logger.error("chat.failed", extra={"error": str(e), "conversation_id": conversation_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI processing failed. Please try again.",
        )

    # Update conversation timestamp
    conv.updated_at = datetime.utcnow()
    db.commit()

    # Return the exact shape the frontend expects
    return {
        "user_message": user_msg,
        "ai_message": ai_msg,
    }


@router.post("/chat", response_model=schemas.AIChatResponse)
async def quick_chat(
    message_data: schemas.AIQuickChat,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Quick chat without creating a conversation (stateless mode).
    Creates a temporary conversation, processes message, returns response.
    """
    if current_user.role != models.UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can use AI chat",
        )

    service = ChatService(db)

    # Create temporary conversation
    temp_conv = service.create_conversation(
        user_id=current_user.id,
        title="Quick Chat",
    )

    try:
        user_msg, ai_msg, agent_response = service.send_message(
            conversation_id=temp_conv.id,
            message=message_data.content,
            current_user=current_user,
        )
        return {"user_message": user_msg, "ai_message": ai_msg}

    except RateLimitExceeded as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
    except PromptInjectionDetected as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except AIEngineError as e:
        logger.error("quick_chat.failed", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI processing failed",
        )
