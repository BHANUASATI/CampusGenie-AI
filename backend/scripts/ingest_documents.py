"""
Ingest the official knowledge documents into ChromaDB
====================================================
Indexes a folder of university documents (policies, notices, timetables) into
the AI engine's vector store so the chatbot can answer questions about them.

This is the safe counterpart to ``reindex_knowledge_base.py``:

* it **never wipes** the collection — the handbook and anything else already
  indexed stays;
* it **replaces** a document by ``source_file`` before re-adding it, so running
  it twice does not duplicate chunks (``document_id`` is a fresh uuid4 per call,
  so a plain re-add would orphan the old chunks forever);
* it drops **byte-identical** copies, which the existing ``_1``/``_2`` suffix
  dedupe misses because upload duplicates look like ``name (1).docx``.

Usage
-----
    python3 scripts/ingest_documents.py                     # ../Documents
    python3 scripts/ingest_documents.py --dir /path/to/docs
    python3 scripts/ingest_documents.py --include-tests      # also synthetic RAG-test files
    python3 scripts/ingest_documents.py --dry-run

Exit code is 0 if every selected document was indexed, 1 otherwise.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from ai_engine.core.config import ai_config  # noqa: E402
from ai_engine.document_pipeline.indexer import index_document_from_path  # noqa: E402
from ai_engine.vectorstore.manager import get_vector_store  # noqa: E402
from scripts.reindex_knowledge_base import infer_doc_type  # noqa: E402

REPO_ROOT = BACKEND_DIR.parent
DEFAULT_DIR = REPO_ROOT / "Documents"

# These documents in the repo are either exact duplicates of another file or an
# older revision of it.  Indexing both makes the retriever rank the weaker copy
# just as highly, and the model then quotes whichever it happened to see.
# Keyed by filename; value is the file that supersedes it.
SUPERSEDED = {
    # Byte-identical to KRMU_Hostel_Residential_Life_Policy_RAG_v1.docx
    "KRMU_Hostel_Residential_Life_Policy_RAG_v1 (1).docx":
        "KRMU_Hostel_Residential_Life_Policy_RAG_v1.docx",
    # v3 is the same policy, expanded (89% similar, +32 words)
    "KRMU_RAG_Attendance_Policy_Knowledge_Base.docx":
        "KRMU_Attendance_Policy_RAG_Knowledge_Base_v3.docx",
}

# Synthetic documents that describe themselves as RAG evaluation fixtures.  The
# chatbot is meant to answer from official university documents only, so these
# are excluded by default — same policy as reindex_knowledge_base._SKIP_FILES.
SYNTHETIC_MARKERS = ("rag_test", "rag test", "test_policy", "synthetic")


def _is_synthetic(name: str) -> bool:
    lowered = name.lower()
    return any(marker in lowered for marker in SYNTHETIC_MARKERS)


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def _logical_name(name: str) -> str:
    """Strip the two copy markers an uploader can add to a filename.

    ``report.pdf`` re-uploaded becomes ``report_1.pdf`` and the OS/browser copy
    is ``report (1).pdf``.  Both are the same logical document, so the same
    normalisation is applied to filenames on disk and to the ``source_file``
    values already stored in the collection.
    """
    name = re.sub(r"\s*\(\d+\)(?=\.[^.]+$)", "", name)   # " (1)"
    return re.sub(r"_\d+(?=\.[^.]+$)", "", name)          # "_1"


def plan(directory: Path, include_tests: bool, indexed: set[str]) -> list[tuple[Path, str]]:
    """Return (path, doc_type) for each document that should be indexed."""
    if not directory.is_dir():
        raise SystemExit(f"not a directory: {directory}")

    already = {_logical_name(sf) for sf in indexed}
    selected: list[tuple[Path, str]] = []
    by_hash: dict[str, Path] = {}
    for path in sorted(directory.iterdir()):
        if not path.is_file() or path.suffix.lower() not in ai_config.ALLOWED_DOCUMENT_EXTENSIONS:
            continue

        if path.name in SUPERSEDED:
            print(f"  skip (superseded by {SUPERSEDED[path.name]})  {path.name}")
            continue

        if _is_synthetic(path.name) and not include_tests:
            print(f"  skip (synthetic RAG-test fixture)              {path.name}")
            continue

        # A document can already be in the collection under a different name —
        # the uploader renamed it when it copied the file.  Re-adding it would
        # duplicate every chunk under a second document_id, and the retriever
        # would then rank two copies of the same text against each other.
        key = _logical_name(path.name)
        if key in already:
            print(f"  skip (already indexed under another filename)   {path.name}")
            continue

        digest = _sha256(path)
        if digest in by_hash:
            print(f"  skip (identical copy of {by_hash[digest].name})  {path.name}")
            continue
        by_hash[digest] = path

        selected.append((path, infer_doc_type(path.name)))
    return selected


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dir", type=Path, default=DEFAULT_DIR, help="folder of documents to index")
    parser.add_argument("--include-tests", action="store_true",
                        help="also index synthetic RAG-test fixtures")
    parser.add_argument("--dry-run", action="store_true", help="list what would be indexed and stop")
    parser.add_argument("--academic-year", default="2026-27")
    args = parser.parse_args()

    store = get_vector_store()
    before = store.count()
    indexed = {s["source_file"] for s in store.list_sources()}
    print(f"Collection {ai_config.CHROMA_COLLECTION_NAME!r} in {ai_config.CHROMA_PERSIST_DIR}")
    print(f"  {before} chunks across {len(indexed)} already-indexed document(s):")
    for name in sorted(indexed):
        print(f"    {name}")
    print()
    print(f"Scanning {args.dir}")
    selected = plan(args.dir, args.include_tests, indexed)

    if not selected:
        print("\nNothing to index.")
        return 0

    print(f"\n{len(selected)} document(s) to index:")
    for path, doc_type in selected:
        print(f"  {doc_type:<12} {path.name}")

    if args.dry_run:
        print("\n--dry-run: nothing written.")
        return 0

    failures: list[str] = []
    for path, doc_type in selected:
        name = path.name
        # Replace, don't append: a fresh document_id on every run would leave
        # the previous copy of this file in the collection forever.
        removed = store.delete_by_source_file(name)
        if removed:
            print(f"\n  removed {removed} stale chunk(s) for {name}")

        started = time.perf_counter()
        try:
            stats = index_document_from_path(
                file_path=str(path),
                doc_type=doc_type,
                department="all",
                semester=None,
                academic_year=args.academic_year,
            )
        except Exception as exc:  # noqa: BLE001
            failures.append(name)
            print(f"\n  FAILED {name}: {type(exc).__name__}: {str(exc)[:160]}")
            continue

        elapsed = time.perf_counter() - started
        print(
            f"  OK {name}\n"
            f"     {stats['chunks_indexed']:>4} chunks | extract {stats['extract_ms']}ms | "
            f"chunk {stats['chunk_ms']}ms | upsert {stats['upsert_ms']}ms | {elapsed:.1f}s total"
        )

    after = store.count()
    print(f"\n{before} -> {after} chunks (+{after - before})")
    if failures:
        print(f"Failed: {', '.join(failures)}")
        return 1
    print("All documents indexed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
