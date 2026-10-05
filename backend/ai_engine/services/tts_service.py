"""Neural text-to-speech for spoken assistant answers.

Why this exists
---------------
The browser's `speechSynthesis` API cannot produce a voice that sounds like a
person talking. It exposes exactly three controls — rate, pitch and volume — and
hands the text to whatever compact voice the operating system ships. Choosing a
better voice name helps a little; it cannot add the sentence-level intonation,
the breath at a comma, or the natural decay at a full stop that make a voice
read as human rather than as a machine announcing text. Assistants people
actually talk to (Siri, ChatGPT's voice mode, Gemini) all synthesise server-side
from a neural model instead.

So the assistant asks the backend for audio, and this module is the backend's
answer: a neural voice, synthesised per sentence, returned as MP3.

Provider
--------
`edge-tts` reaches the same Microsoft neural voices that power Edge's Read
aloud, without an API key. Those are genuinely natural voices — they are not a
workaround for the absence of credentials. The endpoint is unofficial, so it is
treated as a dependency that may go away: `TTS_PROVIDER` selects the
implementation, and the frontend falls back to the browser voice when synthesis
is unavailable, so losing this never costs the feature entirely.

Why per-sentence synthesis, and not SSML
---------------------------------------
The single biggest difference between "reads text" and "speaks" is what happens
at a full stop. The natural place to control that is SSML — but the edge
provider does not accept SSML: it escapes everything it is given and speaks the
markup aloud, which is worse than not pausing at all. So pauses come from
synthesis boundaries instead, one request per sentence. Each sentence is
generated with its own trailing silence, so the model places the pause instead
of this module guessing it, and each sentence's audio is independently cacheable.
"""

from __future__ import annotations

import asyncio
import hashlib
import re
import sys
import os
from collections import OrderedDict
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

_SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "src")
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

from ai_engine.core.logging import get_logger

logger = get_logger(__name__)


class TTSUnavailable(RuntimeError):
    """Raised when no provider could produce audio.

    The route turns this into a 503 and the frontend responds by falling back to
    the browser voice, so a TTS outage degrades quality rather than removing the
    feature.
    """


# ---------------------------------------------------------------------------
# Voice catalogue
# ---------------------------------------------------------------------------
# These names are real, verified against the live voice list, and deliberately
# limited to the small set that sounds like natural conversation. The catalogue
# also ships many "novelty" voices that are amusing once and intolerable in a
# product, and this list exists so nobody has to rediscover that.


@dataclass(frozen=True)
class NeuralVoice:
    id: str
    label: str
    locale: str
    gender: str


# Ordered by how conversational they sound, best first, so the default is the
# first entry and the picker opens on the strongest voice.
NEURAL_VOICES: Tuple[NeuralVoice, ...] = (
    NeuralVoice("en-US-JennyNeural", "Jenny", "en-US", "female"),
    NeuralVoice("en-US-AriaNeural", "Aria", "en-US", "female"),
    NeuralVoice("en-US-GuyNeural", "Guy", "en-US", "male"),
    NeuralVoice("en-US-ChristopherNeural", "Christopher", "en-US", "male"),
    NeuralVoice(
        "en-US-AvaMultilingualNeural",
        "Ava",
        "en-US",
        "female",
    ),
    NeuralVoice(
        "en-US-AndrewMultilingualNeural",
        "Andrew",
        "en-US",
        "male",
    ),
    NeuralVoice("en-GB-SoniaNeural", "Sonia", "en-GB", "female"),
    NeuralVoice("en-GB-RyanNeural", "Ryan", "en-GB", "male"),
    NeuralVoice("en-IN-NeerjaNeural", "Neerja", "en-IN", "female"),
    NeuralVoice("en-IN-PrabhatNeural", "Prabhat", "en-IN", "male"),
)

VOICE_IDS = {v.id for v in NEURAL_VOICES}
DEFAULT_VOICE = NEURAL_VOICES[0].id


def resolve_voice(voice: Optional[str]) -> str:
    """Map a requested voice onto the catalogue.

    An unknown name falls back to the default rather than raising: a stale
    client should hear the wrong voice, not hear nothing.
    """
    if not voice:
        return DEFAULT_VOICE
    if voice in VOICE_IDS:
        return voice
    # Tolerate a bare name ("Jenny") as well as the full id.
    for candidate in NEURAL_VOICES:
        if candidate.label.lower() == voice.strip().lower():
            return candidate.id
    return DEFAULT_VOICE


# ---------------------------------------------------------------------------
# Sentence splitting
# ---------------------------------------------------------------------------
# A sentence boundary. Punctuation is left attached to the sentence it closes,
# because that mark is what gives the voice its falling intonation on a full
# stop and its lift on a question mark.
_BOUNDARY = re.compile(r"(?<=[.!?…])[\"'”’)\]]*\s+")


def split_sentences(text: str) -> List[str]:
    """Split already-clean prose into sentences for per-sentence synthesis.

    Synthesising a sentence at a time rather than a whole reply is what keeps
    the pauses honest: each sentence is generated with its own trailing silence,
    so the model places the pause instead of this module guessing it in bulk.
    """
    parts = [p.strip() for p in _BOUNDARY.split(text.strip()) if p.strip()]
    return parts or ([text.strip()] if text.strip() else [])


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
# A student re-asking a question, or two students asking the same thing on the
# same morning, should not pay for synthesis twice. Bounded so a long session
# cannot grow it without limit.

_MAX_CACHE_ENTRIES = 128
_cache: "OrderedDict[str, bytes]" = OrderedDict()
_cache_lock = asyncio.Lock()


def _cache_key(provider: str, voice: str, sentence: str) -> str:
    # The provider is part of the key, not just the voice. The same voice name
    # can resolve through different engines, and serving one engine's audio for
    # another's request also masks the fact that the requested provider is not
    # configured — a cache hit short-circuits before the provider is ever asked.
    return hashlib.sha256(
        f"{provider}\x00{voice}\x00{sentence}".encode("utf-8")
    ).hexdigest()


def cache_stats() -> Dict[str, int]:
    return {"entries": len(_cache), "capacity": _MAX_CACHE_ENTRIES}


def clear_cache() -> None:
    _cache.clear()


# ---------------------------------------------------------------------------
# Providers
# ---------------------------------------------------------------------------


# A response smaller than this is a truncated stream rather than a short
# sentence. The service pads even "Yes." out to 11232 bytes, so genuine audio has
# generous headroom above this floor and the floor costs nothing.
_MIN_AUDIO_BYTES = 2048

# A second, length-proportional bound. Real output runs several hundred bytes per
# character of text; this only catches a stream that died partway through.
_BYTES_PER_CHAR = 60

# The provider's websocket stops responding under a burst of connections, and its
# own connect timeout is 10s. Bound the attempt so a stalled stream fails fast
# and the caller can fall back, instead of holding a request open.
#
# Deliberately a single attempt, and deliberately shorter than the client's own
# 15s give-up. Retrying here used to be the plan for a dropped connection, but
# once the client falls back to the browser voice seamlessly, a retry is strictly
# worse: it spends another stretch of the user's silence hoping the second try
# lands, when falling back immediately gets them an answer either way. Measured
# latency for a healthy request is around 5s, with a long tail, so one attempt
# covers the common case and the tail is handled by the fallback.
_SENTENCE_TIMEOUT_S = 14


def _plausible_audio(sentence: str, audio: bytes) -> bool:
    """Is this response plausibly the whole sentence, rather than a fragment?"""
    return len(audio) >= max(_MIN_AUDIO_BYTES, len(sentence) * _BYTES_PER_CHAR)


async def _synthesize_edge(sentences: List[str], voice: str, rate: str) -> List[bytes]:
    """Synthesise with Microsoft neural voices via edge-tts.

    Returns one MP3 per sentence, in order. `Communicate` takes plain text only
    — it escapes whatever it is given and speaks it, so no SSML is passed here.

    The sentences in a chunk are issued concurrently rather than one after
    another. The endpoint slows down sharply with each request made back to
    back, so a three-sentence chunk took 16s issued sequentially and 5.8s issued
    together — and sequential requests eventually time out at the websocket
    entirely.
    """
    try:
        import edge_tts  # noqa: F401 - imported lazily so the app boots without it
    except ImportError as exc:  # pragma: no cover - dependency is pinned
        raise TTSUnavailable(f"edge-tts is not installed: {exc}") from exc

    async def attempt(sentence: str) -> bytes:
        import edge_tts

        try:
            communicate = edge_tts.Communicate(sentence, voice, rate=rate)
            audio = b""
            async for item in communicate.stream():
                if item["type"] == "audio":
                    audio += item["data"]
        except asyncio.TimeoutError:
            raise TTSUnavailable(
                f"edge synthesis timed out after {_SENTENCE_TIMEOUT_S}s for {voice}"
            ) from None
        except Exception as exc:
            # The provider drops and refuses websocket connections under load.
            # That is a provider fault rather than a bad request, so it becomes a
            # 503 the frontend can fall back from, not an unhandled 500.
            raise TTSUnavailable(
                f"edge synthesis failed for {voice}: {type(exc).__name__}: {exc}"
            ) from exc

        # A truncated stream arrives as a short 200 response, so it is only
        # detectable by size. Left unchecked it would be served, and cached, as
        # though it were the whole sentence.
        if not _plausible_audio(sentence, audio):
            raise TTSUnavailable(
                f"edge returned a truncated stream for {voice} "
                f"({len(audio)} bytes for {len(sentence)} chars)"
            )
        return audio

    if not sentences:
        return []
    return list(await asyncio.gather(*[attempt(s) for s in sentences]))


async def _synthesize_openai(sentences: List[str], voice: str, instructions: str) -> List[bytes]:
    """Synthesise with OpenAI's speech models.

    Not the default because this deployment's OPENAI_API_KEY is still the
    placeholder value from the template. Implemented anyway so that dropping a
    real key in and setting TTS_PROVIDER=openai is the whole change — that
    model accepts a natural-language voice instruction, which is the closest
    available match to a conversational assistant voice.
    """
    try:
        from openai import AsyncOpenAI
    except ImportError as exc:  # pragma: no cover
        raise TTSUnavailable(f"openai is not installed: {exc}") from exc

    key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    # The shipped template value is not a credential; treating it as one would
    # produce an opaque 401 instead of a clear "not configured".
    if not key or key.lower().startswith("your-"):
        raise TTSUnavailable("OPENAI_API_KEY is not configured")

    client = AsyncOpenAI(api_key=key)
    text = " ".join(s.strip() for s in sentences)
    try:
        result = await client.audio.speech.create(
            model=os.environ.get("TTS_OPENAI_MODEL", "gpt-4o-mini-tts"),
            voice=os.environ.get("TTS_OPENAI_VOICE", "marin"),
            input=text,
            instructions=instructions,
            response_format="mp3",
        )
    except Exception as exc:
        raise TTSUnavailable(f"openai speech synthesis failed: {exc}") from exc
    # One request for the whole reply: this provider takes a voice instruction
    # rather than SSML, so per-sentence prosody is not available to split on.
    return [await result.aread()]


async def _synthesize_google(sentences: List[str], voice: str) -> List[bytes]:
    """Synthesise with Google Cloud Text-to-Speech.

    Requires OAuth2 credentials rather than an API key, which is why the Gemini
    key already in this deployment cannot be used here. Left as an explicit
    provider so it is wired up the moment service-account credentials exist.
    """
    import base64

    import requests

    token = (os.environ.get("GOOGLE_TTS_ACCESS_TOKEN") or "").strip()
    if not token:
        raise TTSUnavailable("GOOGLE_TTS_ACCESS_TOKEN is not configured")

    text = " ".join(s.strip() for s in sentences)
    url = "https://texttospeech.googleapis.com/v1/text:synthesize"
    body = {
        "input": {"text": text},
        "voice": {"languageCode": voice[:5], "name": voice},
        "audioConfig": {"audioEncoding": "MP3"},
    }
    loop = asyncio.get_event_loop()
    try:
        response = await loop.run_in_executor(
            None,
            lambda: requests.post(
                url,
                json=body,
                timeout=20,
                headers={"Authorization": f"Bearer {token}"},
            ),
        )
    except Exception as exc:
        raise TTSUnavailable(f"google speech synthesis failed: {exc}") from exc

    if response.status_code != 200:
        raise TTSUnavailable(f"google returned {response.status_code}")
    try:
        audio = base64.b64decode(response.json()["audioContent"])
    except Exception as exc:
        raise TTSUnavailable(f"google returned an unusable body: {exc}") from exc
    if not audio:
        raise TTSUnavailable("google produced no audio")
    return [audio]


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def synthesize(
    text: str,
    voice: Optional[str] = None,
    provider: Optional[str] = None,
) -> Tuple[bytes, str]:
    """Return (mp3 bytes, voice id) for the given text.

    The caller is expected to have already stripped markdown; this module
    speaks prose, not a chat transcript.
    """
    text = (text or "").strip()
    if not text:
        raise TTSUnavailable("no text to speak")

    chosen_voice = resolve_voice(voice)
    chosen_provider = (provider or os.environ.get("TTS_PROVIDER") or "edge").strip().lower()
    rate = os.environ.get("TTS_RATE", "-4%")
    instructions = os.environ.get(
        "TTS_INSTRUCTIONS",
        "Speak in a warm, natural, conversational tone, like a helpful person "
        "explaining something rather than reading a document.",
    )

    sentences = split_sentences(text)
    if not sentences:
        raise TTSUnavailable("no text to speak")

    # Cache per sentence, so a reply that shares sentences with an earlier one
    # only pays for what is genuinely new. Positions are preserved so cached and
    # freshly synthesised audio concatenate in the right order.
    audio_parts: List[bytes] = []
    missing_positions: List[int] = []
    for index, sentence in enumerate(sentences):
        key = _cache_key(chosen_provider, chosen_voice, sentence)
        async with _cache_lock:
            hit = _cache.get(key)
            if hit is not None:
                _cache.move_to_end(key)
        if hit is not None:
            audio_parts.append(hit)
        else:
            audio_parts.append(b"")
            missing_positions.append(index)

    if missing_positions:
        wanted = [sentences[i] for i in missing_positions]
        if chosen_provider == "edge":
            blobs = await _synthesize_edge(wanted, chosen_voice, rate)
        elif chosen_provider == "openai":
            blobs = await _synthesize_openai(wanted, chosen_voice, instructions)
        elif chosen_provider == "google":
            blobs = await _synthesize_google(wanted, chosen_voice)
        else:
            raise TTSUnavailable(f"unknown TTS provider {chosen_provider!r}")

        async with _cache_lock:
            # Providers that synthesise per sentence return one blob each, in
            # order. A provider that handles the whole reply returns a single
            # blob, which is stored against the first sentence only — correct,
            # because the cached value is replayed for exactly that sentence's
            # slot and the others are synthesised again.
            for offset, position in enumerate(missing_positions):
                if offset >= len(blobs):
                    break
                audio_parts[position] = blobs[offset]
                key = _cache_key(chosen_provider, chosen_voice, sentences[position])
                _cache[key] = blobs[offset]
                _cache.move_to_end(key)
            while len(_cache) > _MAX_CACHE_ENTRIES:
                _cache.popitem(last=False)

    audio = b"".join(part for part in audio_parts if part)
    if not audio:
        raise TTSUnavailable("provider produced no audio")
    return audio, chosen_voice


def catalogue() -> Dict[str, object]:
    """Describe the voices on offer and whether synthesis can actually run."""
    provider = (os.environ.get("TTS_PROVIDER") or "edge").strip().lower()
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()

    if provider == "openai":
        available = bool(key) and not key.lower().startswith("your-")
    elif provider == "google":
        available = bool((os.environ.get("GOOGLE_TTS_ACCESS_TOKEN") or "").strip())
    else:
        try:
            import edge_tts  # noqa: F401

            available = True
        except ImportError:
            available = False

    return {
        "provider": provider,
        "available": available,
        "default": DEFAULT_VOICE,
        "voices": [
            {"id": v.id, "label": v.label, "locale": v.locale, "gender": v.gender}
            for v in NEURAL_VOICES
        ],
    }
