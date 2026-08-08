#!/usr/bin/env python3
"""
Script to batch index all knowledge base documents into ChromaDB.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path so ai_engine modules are importable
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from ai_engine.document_pipeline.indexer import index_knowledge_directory

def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else str(backend_dir / "knowledge")
    print(f"==================================================")
    print(f" 🚀 Starting Knowledge Directory Indexing")
    print(f" Target Directory: {target_dir}")
    print(f"==================================================")

    try:
        summary = index_knowledge_directory(target_dir)
        print(f"\n✅ Indexing Process Complete!")
        print(f"  • Total files found: {summary['total_files']}")
        print(f"  • Successfully indexed: {summary['indexed_files']}")
        print(f"  • Total vector chunks created: {summary['total_chunks']}")

        if summary['details']:
            print(f"\n📋 Document Details:")
            for item in summary['details']:
                print(f"  - [{item.get('source_file')}] -> {item.get('chunks_indexed')} chunks ({item.get('total_latency_ms', 0):.1f} ms)")

        if summary['errors']:
            print(f"\n⚠️ Errors encountered ({len(summary['errors'])}):")
            for err in summary['errors']:
                print(f"  - {err['file']}: {err['error']}")

    except Exception as exc:
        print(f"\n❌ Error during indexing execution: {exc}")
        sys.exit(1)

if __name__ == "__main__":
    main()
