"""
AI Assistant Routes — Shim
===========================
This file is kept for backward compatibility (main.py imports `router` from here).
All logic has been moved to the enterprise AI engine.

This shim re-exports the router from ai_engine/api/ai_routes.py.
"""

import sys
import os

# Ensure backend/ is on sys.path so ai_engine can be imported
_BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..")
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from ai_engine.api.ai_routes import router  # noqa: F401

# Also export document and health routers for use in main.py
from ai_engine.api.document_routes import router as document_ai_router  # noqa: F401
from ai_engine.api.health import router as health_router  # noqa: F401
