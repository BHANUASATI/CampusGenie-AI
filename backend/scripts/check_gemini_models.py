"""
Gemini Model Health Check
=========================
The free tier caps each model at a fixed number of requests per day.  Once a
model is exhausted it returns ``429 ... exceeded your current quota`` in well
under a second, and the AI engine's client rotates to the next model in
``GEMINI_FALLBACK_MODELS``.

That rotation is fast now, but you still pay a round trip per dead model and
lose the quality of a bigger model for the rest of the day.  This script tells
you which models your key can actually reach right now, and how fast each one
answers with this app's real prompt size.

Usage
-----
    python3 scripts/check_gemini_models.py            # short prompt, all models
    python3 scripts/check_gemini_models.py --full     # also replay the RAG prompt

Exit code is 0 when at least one model answers, 1 otherwise — handy in CI or
before a demo.
"""

from __future__ import annotations

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ai_engine.core.config import ai_config  # noqa: E402

# Small prompt: enough to prove the model answers, quick enough to stay usable
# while a model is quota-limited.
PING = "Reply with the single word: ok"

# Same rough shape as a real RAG answer prompt (~5k input tokens) so the
# reported latency matches what the chatbot actually experiences.
BIG_PROMPT = (
    "You are an academic assistant. Use the handbook excerpt below to answer.\n\n"
    "Handbook excerpt:\n" + ("Course Unit 3: Design Patterns. " * 900) + "\n\n"
    'Reply as JSON: {"answer": "...", "confidence": 0.0, "sources": [], '
    '"follow_up_questions": []}'
)


def _candidates() -> list[str]:
    models = [ai_config.GEMINI_CHAT_MODEL, ai_config.GEMINI_FAST_MODEL]
    models.extend(ai_config.GEMINI_FALLBACK_MODELS or [])
    seen: list[str] = []
    for m in models:
        m = (m or "").strip()
        if m and m not in seen:
            seen.append(m)
    return seen


def _probe(model_name: str, prompt: str) -> tuple[bool, float, str]:
    import google.generativeai as genai

    genai.configure(api_key=ai_config.GEMINI_API_KEY)
    t0 = time.perf_counter()
    try:
        model = genai.GenerativeModel(
            model_name,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1, max_output_tokens=ai_config.GEMINI_MAX_OUTPUT_TOKENS
            ),
        )
        response = model.generate_content(
            prompt, request_options={"timeout": int(ai_config.GEMINI_TIMEOUT_SECONDS * 1000)}
        )
        elapsed = time.perf_counter() - t0
        usage = getattr(response, "usage_metadata", None)
        tokens = f"{usage.prompt_token_count}->{usage.candidates_token_count} tok" if usage else "-"
        return True, elapsed, tokens
    except Exception as exc:  # noqa: BLE001
        return False, time.perf_counter() - t0, str(exc).replace("\n", " ")[:150]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--full", action="store_true", help="also time the full RAG-sized prompt")
    args = parser.parse_args()

    if not (ai_config.GEMINI_API_KEY or "").strip():
        print("GEMINI_API_KEY is not set in backend/.env")
        return 1

    prompts = [("ping", PING)]
    if args.full:
        prompts.append(("rag", BIG_PROMPT))

    healthy: list[str] = []
    for label, prompt in prompts:
        print(f"\n=== {label} prompt ({len(prompt)} chars) ===")
        for model_name in _candidates():
            ok, elapsed, detail = _probe(model_name, prompt)
            status = "OK  " if ok else "FAIL"
            print(f"  {status} {model_name:<26} {elapsed:6.1f}s  {detail}")
            if ok and label == "ping":
                healthy.append(model_name)

    print("\n--- recommendation ---")
    if not healthy:
        print("  No model responded. Check GEMINI_API_KEY, billing, or wait for the")
        print("  daily quota to reset. OpenRouter fallback needs OPENROUTER_API_KEY.")
        return 1

    print(f"  Fastest reachable: {healthy[0]}")
    print(f"  Set GEMINI_CHAT_MODEL={healthy[0]}")
    print(f"  Set GEMINI_FAST_MODEL={healthy[0]}")
    print("  GEMINI_FALLBACK_MODELS=" + str(healthy[1:] or healthy[:1]))
    print("  Put the remaining models after them so a 429 costs ~0.5s, not a minute.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
