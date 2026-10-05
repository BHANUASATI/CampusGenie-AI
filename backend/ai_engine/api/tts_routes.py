"""Spoken answers.

`GET  /api/ai/tts/voices` — the neural voices on offer, and whether synthesis
                                can actually run on this deployment.
`POST /api/ai/tts`         — MP3 audio for one answer.

The frontend asks `/voices` once and, when `available` is true, sends each
sentence here instead of using the browser's voice. When it is false the
frontend keeps using the browser, so this endpoint failing costs audio quality
and nothing else.
"""

from __future__ import annotations

import sys
import os

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

_SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "src")
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

import models
from dependencies import get_current_user

from ai_engine.core.logging import get_logger
from ai_engine.services.tts_service import TTSUnavailable, catalogue, synthesize

logger = get_logger(__name__)
router = APIRouter()

# A spoken answer is a few hundred words at most. Capping the request keeps a
# client from asking for an unbounded synthesis in one call.
MAX_CHARS = 4000


class SpeakRequest(BaseModel):
    text: str = Field(..., description="Plain prose. Markdown must already be stripped.")
    voice: Optional[str] = Field(None, description="Neural voice id, e.g. en-US-JennyNeural")
    provider: Optional[str] = Field(None, description="Override TTS_PROVIDER for this call")


@router.get("/tts/voices")
def list_voices(current_user: models.User = Depends(get_current_user)) -> dict:
    """Voices available for spoken answers."""
    return catalogue()


@router.post("/tts")
async def speak(
    request: SpeakRequest,
    current_user: models.User = Depends(get_current_user),
) -> Response:
    """Synthesise one answer as MP3."""
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No text to speak",
        )
    if len(text) > MAX_CHARS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Text is too long to speak in one request (max {MAX_CHARS} characters)",
        )

    try:
        audio, voice = await synthesize(text, request.voice, request.provider)
    except TTSUnavailable as exc:
        # Not an error the user caused, and not something they can fix by
        # retrying the same call. The frontend's response is to use the browser
        # voice instead.
        logger.warning("Neural TTS unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Neural voice unavailable: {exc}",
        )
    except Exception as exc:  # pragma: no cover - provider/network surprises
        logger.exception("Neural TTS failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Neural voice failed: {exc}",
        )

    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={
            # Lets the frontend confirm which voice actually spoke, which is the
            # only way to notice a silent fallback to the browser voice.
            "X-TTS-Voice": voice,
            "Cache-Control": "private, max-age=3600",
        },
    )
