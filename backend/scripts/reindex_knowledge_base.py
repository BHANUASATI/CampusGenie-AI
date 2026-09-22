"""
Reindex Knowledge Base
======================
Clears the main ChromaDB collection and re-indexes every unique document in
the uploads/ai_documents directory with proper doc_type metadata.

Why:
   - The collection previously contained only 2 of ~16 uploaded documents
     (an MCA handbook copy + an EDM Fest flyer), so the chatbot had no
     knowledge of hostels, IT services, timetables, attendance rules, etc.
   - Duplicate uploads (e.g. `..._1.pdf`, `..._2.pdf`) shadowed other sources.

Run:  PYTHONPATH=.. python3 scripts/reindex_knowledge_base.py
      (from inside backend/)   -- or --
      python3 backend/scripts/reindex_knowledge_base.py
"""

from __future__ import annotations

import re
import sys
from collections import OrderedDict
from pathlib import Path

# Make ai_engine importable regardless of CWD
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from ai_engine.core.config import ai_config  # noqa: E402
from ai_engine.document_pipeline.indexer import index_document_from_path  # noqa: E402
from ai_engine.vectorstore.manager import get_vector_store  # noqa: E402


# ---------------------------------------------------------------------------
# 1. doc_type inference from filename
# ---------------------------------------------------------------------------
_DOC_TYPE_RULES = (
    ("timetable", ("timetable",)),
    ("attendance", ("attendance",)),
    ("policy", ("policy", "regulation")),
    ("notice", ("notice", "circular", "announcement", "event", "fest")),
    ("admission", ("admission", "admissions")),
    ("faculty", ("faculty",)),
    ("scholarship", ("scholarship",)),
    ("placement", ("placement", "internship")),
    ("handbook", ("handbook", "manual", "rules")),
)


def infer_doc_type(filename: str) -> str:
    lower = filename.lower()
    for doc_type, keywords in _DOC_TYPE_RULES:
        if any(keyword in lower for keyword in keywords):
            return doc_type
    return "general"


# ---------------------------------------------------------------------------
# 2. Dedupe helper — same file uploaded repeatedly gets _1/_2/_3 suffixes
# ---------------------------------------------------------------------------
def _dedupe_key(filename: str) -> str:
    """Strip a trailing `_N` counter before the extension (uploader artifact)."""
    return re.sub(r"_\d+(?=\.[^.]+$)", "", filename)


def collect_unique_files(directory: Path) -> list[Path]:
    """Return one file per logical document, preferring the original name."""
    by_key: OrderedDict[str, Path] = OrderedDict()
    for path in sorted(directory.iterdir()):
        if not path.is_file():
            continue
        ext = path.suffix.lower()
        if ext not in ai_config.ALLOWED_DOCUMENT_EXTENSIONS:
            print(f"  skip (unsupported): {path.name}")
            continue
        key = _dedupe_key(path.name)
        if key not in by_key:
            by_key[key] = path
        # Original (no _N suffix) wins over copies
        elif _dedupe_key(path.name) == path.name and path.name != by_key[key].name:
            by_key[key] = path
    return list(by_key.values())


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    docs_dir = Path(ai_config.AI_DOCUMENTS_DIR)
    print(f"--- Reindexing knowledge base ---")
    print(f"Docs dir: {docs_dir}")

    files = collect_unique_files(docs_dir)
    print(f"\nFound {len(files)} unique documents:\n")
    for f in files:
        print(f"  - {f.name}  ->  {infer_doc_type(f.name)}")

    # Wipe the old (incomplete / duplicative) collection
    vector_store = get_vector_store()
    old_count = vector_store.count()
    if old_count:
        print(f"\nClearing old collection ({old_count} chunks)...")
        collection = vector_store.collection
        ids = collection.get(include=[])["ids"]
        if ids:
            for i in range(0, len(ids), 5000):
                collection.delete(ids=ids[i:i + 5000])
        print(f"Cleared. Remaining: {vector_store.count()}")

    total_chunks = 0
    failures = []
    for path in files:
        try:
            stats = index_document_from_path(
                file_path=str(path),
                doc_type=infer_doc_type(path.name),
                department="all",
                semester=None,
                academic_year="2026-27",
            )
            total_chunks += stats["chunks_indexed"]
            print(f"  ✓ {path.name}: {stats['chunks_indexed']} chunks"
                  f" ({stats.get('total_latency_ms', 0) / 1000:.1f}s)")
        except Exception as exc:  # per-file failure must not abort the batch
            failures.append((path.name, str(exc)[:200]))
            print(f"  ✗ {path.name}: {exc}")

    print(f"\n=== Done: {total_chunks} chunks indexed across {len(files) - len(failures)} docs ===")
    if failures:
        print("Failures:")
        for name, err in failures:
            print(f"  - {name}: {err}")


if __name__ == "__main__":
    main()