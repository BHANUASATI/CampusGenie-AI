#!/usr/bin/env python3
"""
End-to-End Dual-Lens System Validator
======================================
Tests the entire CampusGenie AI pipeline layer-by-layer:

  Layer 1: ChromaDB Vector Store — collection populated, chunk count, source list
  Layer 2: Hybrid Search (BM25 + Vector + RRF) — retrieves relevant docs
  Layer 3: Cross-Encoder Reranker — reranks candidates correctly
  Layer 4: Domain Skill Router — selects correct skill per intent/query
  Layer 5: Dual-Lens Generator — Lens 1 (RAG) + Lens 2 (Advisor) wiring
  Layer 6: Answer Generator Integration — full pipeline entry point
"""

import sys
import time
import traceback
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


# ============================================================================
# Helpers
# ============================================================================

PASS = "✅ PASS"
FAIL = "❌ FAIL"
WARN = "⚠️  WARN"

results: List[Dict[str, Any]] = []


def record(layer: str, test: str, passed: bool, detail: str = ""):
    status = PASS if passed else FAIL
    results.append({"layer": layer, "test": test, "passed": passed, "detail": detail})
    print(f"  {status}  {test}" + (f"  ({detail})" if detail else ""))


def section(title: str):
    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print(f"{'=' * 70}")


# ============================================================================
# Layer 1: ChromaDB Vector Store
# ============================================================================
def test_layer1_vectorstore():
    section("Layer 1: ChromaDB Vector Store")
    from ai_engine.vectorstore.manager import get_vector_store

    vs = get_vector_store()

    # Test 1.1: Collection exists and has chunks
    count = vs.count()
    record("L1", "Collection has indexed chunks", count > 0, f"{count} chunks found")

    # Test 1.2: Source files are listed
    sources = vs.list_sources()
    source_names = [s["source_file"] for s in sources]
    record("L1", "list_sources() returns indexed files", len(sources) > 0, f"{len(sources)} sources")

    # Test 1.3: All 10 knowledge docs are indexed
    expected_files = [
        "01_attendance_policy.txt",
        "02_lab_rules_and_timings.txt",
        "03_examination_and_fee_structure.pdf",
        "04_academic_calendar.txt",
        "05_hostel_rules.txt",
        "06_library_rules.txt",
        "07_placement_policy.txt",
        "08_code_of_conduct_antiragging.txt",
        "09_mca_student_handbook.pdf",
        "10_grading_system.pdf",
    ]
    missing = [f for f in expected_files if f not in source_names]
    record("L1", "All 10 knowledge documents indexed", len(missing) == 0,
           f"Missing: {missing}" if missing else "All present")

    return vs


# ============================================================================
# Layer 2: Hybrid Search
# ============================================================================
def test_layer2_hybrid_search(vs):
    section("Layer 2: Hybrid Search (BM25 + Vector + RRF)")

    test_queries = [
        ("What is the minimum attendance?", "01_attendance_policy.txt"),
        ("What are hostel curfew timings?", "05_hostel_rules.txt"),
        ("What is the placement CGPA cutoff?", "07_placement_policy.txt"),
        ("What is the anti-ragging policy?", "08_code_of_conduct_antiragging.txt"),
    ]

    for query, expected_source in test_queries:
        t0 = time.time()
        docs = vs.hybrid_search(query=query, top_k=5)
        latency = (time.time() - t0) * 1000

        retrieved_sources = [d.metadata.source_file for d in docs]
        hit = expected_source in retrieved_sources
        record("L2", f"Hybrid search: '{query[:45]}...'",
               hit, f"{'HIT' if hit else 'MISS'} in top-5 | {latency:.0f}ms | got: {retrieved_sources[:3]}")

    return True


# ============================================================================
# Layer 3: Cross-Encoder Reranker
# ============================================================================
def test_layer3_reranker(vs):
    section("Layer 3: Cross-Encoder Reranker")
    from ai_engine.embeddings.reranker import get_reranker

    reranker = get_reranker()
    record("L3", "CrossEncoderReranker loaded", reranker is not None,
           f"Model: {reranker.model.model.name_or_path if hasattr(reranker.model, 'model') else 'loaded'}")

    # Rerank test
    query = "What is the minimum attendance requirement?"
    docs = vs.hybrid_search(query=query, top_k=5)
    doc_texts = [d.content for d in docs]
    reranked = reranker.rerank(query=query, documents=doc_texts, top_n=3)

    record("L3", "Reranker returns ranked results", len(reranked) > 0, f"{len(reranked)} results")

    # Check top-1 is from the correct source
    if reranked:
        top_idx, top_score = reranked[0]
        top_source = docs[top_idx].metadata.source_file
        record("L3", "Top-1 reranked = attendance_policy",
               "attendance" in top_source.lower(),
               f"Source: {top_source} (score: {top_score:.4f})")

    return True


# ============================================================================
# Layer 4: Domain Skill Router
# ============================================================================
def test_layer4_skills():
    section("Layer 4: Domain Skill Router")
    from ai_engine.skills.domain_skills import (
        get_skill_for_intent,
        AcademicPolicySkill,
        CareerPlacementSkill,
        StudentWelfareSkill,
        BaseDomainSkill,
    )
    from ai_engine.schemas.intent import IntentType

    test_cases = [
        ("What is my attendance?", IntentType.ATTENDANCE_QUERY, "Academic"),
        ("How to prepare for placement?", IntentType.UNKNOWN, "Career"),
        ("What are hostel curfew rules?", IntentType.UNKNOWN, "Welfare"),
        ("Tell me about the library books", IntentType.UNKNOWN, "Welfare"),
        ("What is the exam fee?", IntentType.EXAM_QUERY, "Academic"),
        ("How to build resume for interviews?", IntentType.UNKNOWN, "Career"),
        ("What is the weather today?", IntentType.UNKNOWN, "General"),
    ]

    for query, intent, expected_prefix in test_cases:
        skill = get_skill_for_intent(intent, query)
        match = expected_prefix.lower() in skill.name.lower()
        record("L4", f"Skill for '{query[:40]}...'",
               match, f"Got: {skill.name}")

    # Test that skill system prompts are non-empty
    for SkillCls in [AcademicPolicySkill, CareerPlacementSkill, StudentWelfareSkill]:
        s = SkillCls()
        prompt = s.get_system_prompt({})
        record("L4", f"{s.name} has system prompt",
               len(prompt) > 50, f"{len(prompt)} chars")

    # Test advisory guidance generation
    s = AcademicPolicySkill()
    guidance = s.generate_advisory_guidance("test question", "test facts")
    record("L4", "generate_advisory_guidance() works",
           len(guidance) > 30, f"{len(guidance)} chars")

    return True


# ============================================================================
# Layer 5: Dual-Lens Generator Wiring
# ============================================================================
def test_layer5_dual_lens_wiring():
    section("Layer 5: Dual-Lens Generator Wiring")

    # Test that imports work
    try:
        from ai_engine.agents.dual_lens_generator import DualLensGenerator
        record("L5", "DualLensGenerator import", True, "")
    except ImportError as e:
        record("L5", "DualLensGenerator import", False, str(e))
        return False

    # Verify all 3 methods exist
    has_lens1 = hasattr(DualLensGenerator, "generate_lens1_rag_auditor")
    has_lens2 = hasattr(DualLensGenerator, "generate_lens2_skill_advisor")
    has_combined = hasattr(DualLensGenerator, "generate_dual_lens_response")
    record("L5", "DualLensGenerator has all 3 methods",
           has_lens1 and has_lens2 and has_combined,
           f"lens1={has_lens1}, lens2={has_lens2}, combined={has_combined}")

    # Verify call_llm is used correctly (returns LLMResult, needs .text)
    import inspect
    src = inspect.getsource(DualLensGenerator.generate_lens1_rag_auditor)
    uses_text = "llm_result" in src and ".text" in src
    record("L5", "Lens 1 uses LLMResult.text (not raw string)",
           uses_text, "Properly accesses .text from LLMResult")

    src2 = inspect.getsource(DualLensGenerator.generate_lens2_skill_advisor)
    uses_text2 = "llm_result" in src2 and ".text" in src2
    record("L5", "Lens 2 uses LLMResult.text (not raw string)",
           uses_text2, "Properly accesses .text from LLMResult")

    return True


# ============================================================================
# Layer 6: Answer Generator Integration
# ============================================================================
def test_layer6_answer_generator():
    section("Layer 6: Answer Generator Integration")

    from ai_engine.agents.answer_generator import generate_answer_node, _parse_answer_json
    from ai_engine.schemas.intent import IntentType

    # Test 6.1: _parse_answer_json handles valid JSON
    valid_json = '{"answer": "Hello", "confidence": 0.9, "sources": [], "follow_up_questions": []}'
    parsed = _parse_answer_json(valid_json)
    record("L6", "_parse_answer_json — valid JSON", parsed["answer"] == "Hello", "")

    # Test 6.2: _parse_answer_json handles markdown-fenced JSON
    fenced = '```json\n{"answer": "World", "confidence": 0.8, "sources": [], "follow_up_questions": []}\n```'
    parsed2 = _parse_answer_json(fenced)
    record("L6", "_parse_answer_json — fenced JSON", parsed2["answer"] == "World", "")

    # Test 6.3: _parse_answer_json handles broken JSON gracefully
    broken = "This is not JSON at all"
    parsed3 = _parse_answer_json(broken)
    record("L6", "_parse_answer_json — broken JSON fallback",
           parsed3["confidence"] == 0.5 and parsed3["answer"] == broken, "")

    # Test 6.4: Greeting intent returns canned response without LLM call
    greeting_state = {
        "user_message": "Hello!",
        "user_context": {},
        "intent": IntentType.GREETING,
        "retrieved_documents": [],
        "tool_result": None,
        "conversation_history": [],
        "trace_id": "test-greeting",
        "execution_trace": [],
    }
    result = generate_answer_node(greeting_state)
    has_response = result.get("agent_response") is not None
    record("L6", "GREETING intent → canned response (no LLM)",
           has_response and result["agent_response"].confidence == 1.0, "")

    # Test 6.5: No context → no information response
    no_ctx_state = {
        "user_message": "What is the Wi-Fi password?",
        "user_context": {},
        "intent": IntentType.UNKNOWN,
        "retrieved_documents": [],
        "tool_result": None,
        "conversation_history": [],
        "trace_id": "test-no-ctx",
        "execution_trace": [],
    }
    result2 = generate_answer_node(no_ctx_state)
    has_resp2 = result2.get("agent_response") is not None
    record("L6", "No context → NO_INFORMATION_RESPONSE",
           has_resp2 and result2["agent_response"].confidence == 0.0, "")

    # Test 6.6: DualLensGenerator is imported in answer_generator
    import inspect
    src = inspect.getsource(generate_answer_node)
    has_dual_lens = "DualLensGenerator" in src
    record("L6", "answer_generator imports DualLensGenerator",
           has_dual_lens, "Dual-lens integration active")

    return True


# ============================================================================
# Layer 7: RAG Prompt Construction
# ============================================================================
def test_layer7_rag_prompt():
    section("Layer 7: RAG Prompt & Few-Shot Construction")
    from ai_engine.prompts.rag_prompt import build_rag_prompt

    prompt = build_rag_prompt(
        user_question="What is the minimum attendance?",
        documents=[],
        tool_result=None,
        conversation_history=[],
    )

    record("L7", "build_rag_prompt returns non-empty", len(prompt) > 100, f"{len(prompt)} chars")

    has_few_shot = "FEW-SHOT" in prompt or "EXAMPLE" in prompt.upper()
    record("L7", "Few-shot examples present in prompt", has_few_shot, "")

    return True


# ============================================================================
# Run All Tests
# ============================================================================
def main():
    print("\n" + "█" * 70)
    print("  🔬 CAMPUSGENIE DUAL-LENS E2E SYSTEM VALIDATOR")
    print("█" * 70)

    total_start = time.time()

    try:
        vs = test_layer1_vectorstore()
        test_layer2_hybrid_search(vs)
        test_layer3_reranker(vs)
        test_layer4_skills()
        test_layer5_dual_lens_wiring()
        test_layer6_answer_generator()
        test_layer7_rag_prompt()
    except Exception as e:
        print(f"\n💥 FATAL ERROR during testing: {e}")
        traceback.print_exc()
        sys.exit(1)

    total_time = time.time() - total_start

    # Summary
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    total = len(results)

    section("📊 FINAL SUMMARY")
    print(f"  Total Tests : {total}")
    print(f"  Passed      : {passed}")
    print(f"  Failed      : {failed}")
    print(f"  Duration    : {total_time:.1f}s")
    print()

    if failed > 0:
        print("  ❌ FAILED TESTS:")
        for r in results:
            if not r["passed"]:
                print(f"     [{r['layer']}] {r['test']}  —  {r['detail']}")
        print()

    if failed == 0:
        print("  🏆 ALL TESTS PASSED — SYSTEM IS FULLY OPERATIONAL!")
    else:
        print(f"  ⚠️  {failed} TEST(S) FAILED — REVIEW ABOVE FOR DETAILS.")

    print("=" * 70)
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
