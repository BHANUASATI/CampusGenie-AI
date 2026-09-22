"""
Direct AI Chat Test
==================
Test the AI chat system directly to identify response issues.
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from ai_engine.llm.client import call_llm
from ai_engine.core.config import ai_config

def test_llm_direct():
    """Test LLM call directly."""
    print("=== Testing LLM Direct Call ===\n")
    
    test_prompt = """You are a helpful assistant. Answer this question: What is the capital of France?
Provide your answer in JSON format:
{
  "answer": "your answer here",
  "confidence": 0.9
}"""
    
    print(f"Testing with provider: {ai_config.LLM_PROVIDER}")
    print(f"Model: {ai_config.LLM_MODEL}")
    print()
    
    try:
        if ai_config.LLM_PROVIDER == "openrouter":
            from ai_engine.llm.client import _call_openrouter
            result = _call_openrouter(
                prompt=test_prompt,
                temperature=0.3,
                max_tokens=100,
            )
        else:
            result = call_llm(
                prompt=test_prompt,
                temperature=0.3,
                max_tokens=100,
            )
        
        print("✅ LLM Call Successful!")
        print(f"Provider: {result.provider}")
        print(f"Model: {result.model}")
        print(f"Response: {result.text}")
        print(f"Prompt tokens: {result.prompt_tokens}")
        print(f"Completion tokens: {result.completion_tokens}")
        print(f"Latency: {result.latency_ms:.2f}ms")
        print(f"Fallback used: {result.fallback_used}")
        
        return True
        
    except Exception as e:
        print(f"❌ LLM Call Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_llm_direct()