"""
Rebuild the Chroma index from every document file on disk.

Railway can start a container with an empty volume mounted over the image's
baked-in ChromaDB directory. Running this at startup guarantees that the index
always matches the current files and the current OCR/extraction code, instead
of silently serving a stale (or empty) index after a redeploy.
"""

import os
import sys
from pathlib import Path

_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # /app/backend
sys.path.insert(0, _BASE)
sys.path.insert(0, os.path.join(_BASE, "src"))

from ai_engine.core.config import ai_config
from ai_engine.document_pipeline.indexer import index_document_from_path
from ai_engine.vectorstore.manager import get_vector_store


def main() -> None:
    vector_store = get_vector_store()
    collection = vector_store.collection

    existing = collection.get()
    stale_ids = existing.get("ids") or []
    if stale_ids:
        collection.delete(ids=stale_ids)
        print(f"Cleared {len(stale_ids)} stale chunks from the index.")

    docs_dir = Path(ai_config.AI_DOCUMENTS_DIR)
    allowed = {ext.lower() for ext in ai_config.ALLOWED_DOCUMENT_EXTENSIONS}
    files = sorted(
        path for path in docs_dir.iterdir()
        if path.is_file() and path.suffix.lower() in allowed and path.stat().st_size > 100
    ) if docs_dir.exists() else []

    ok = failed = 0
    for path in files:
        print(f"  indexing {path.name} ... ", end="", flush=True)
        try:
            stats = index_document_from_path(
                str(path),
                doc_type="general",
                department="all",
            )
            print(f"OK ({stats.get('chunks_indexed', 0)} chunks)")
            ok += 1
        except Exception as exc:  # keep rebuilding the remaining documents
            print(f"FAIL: {exc}")
            failed += 1

    print(
        f"Knowledge base rebuilt: {vector_store.count()} chunks | "
        f"{ok} files indexed | {failed} failed | {len(files)} files on disk"
    )


if __name__ == "__main__":
    main()
