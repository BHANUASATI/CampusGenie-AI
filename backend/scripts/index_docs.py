"""
Idempotent document indexer — called by startup.sh after server is ready.
Indexes any files in AI_DOCUMENTS_DIR not already in ChromaDB.
"""
import sys
import os

sys.path.insert(0, "/app/src")

from ai_engine.document_pipeline.indexer import index_document_from_path
from ai_engine.vectorstore.manager import get_vector_store

DEST = "/app/uploads/ai_documents"
FILES = [
    "KRMU_Attendance_Policy_RAG_Knowledge_Base_v3.docx",
    "KRMU_Academic_Timetable_Notice_MCA_BCA_BTech_RAG_v1.docx",
    "KRMU_Hostel_Residential_Life_Policy_RAG_v1.docx",
    "KRMU_Campus_Event_Notice_RAG_v1.docx",
    "KRMU_Semester_Fee_Submission_Notice_2026_27.docx",
    "KR_Mangalam_University_EDM_Fest_2026_Event_Document.docx",
    "KRMU_Master_Timetable_RAG_Test_v2.docx",
    "MCA2025-27Handbook_Core(14-07-25).pdf",
]


def main():
    vs = get_vector_store()
    already = {d["source_file"] for d in vs.list_sources()}
    print(f"Already indexed: {len(already)} docs, {vs.count()} chunks")

    ok = fail = skipped = 0
    for fname in FILES:
        if fname in already:
            print(f"  skip (indexed): {fname}")
            skipped += 1
            continue
        fpath = os.path.join(DEST, fname)
        if not os.path.exists(fpath) or os.path.getsize(fpath) < 1000:
            print(f"  skip (missing): {fname}")
            continue
        print(f"  indexing: {fname}...", end=" ", flush=True)
        try:
            index_document_from_path(fpath, doc_type="knowledge_base", department="all")
            print("OK")
            ok += 1
        except Exception as e:
            print(f"FAIL: {e}")
            fail += 1

    print(f"\nKnowledge base: {vs.count()} total chunks | {ok} new | {skipped} skipped | {fail} failed")


if __name__ == "__main__":
    main()
