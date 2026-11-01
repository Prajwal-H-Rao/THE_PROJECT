#!/usr/bin/env python3
"""Tests for Lab 11: Four-model benchmark."""

import sys
import asyncio
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "services" / "agent-orchestrator"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "services" / "model-gateway"))

from run_eval import (
    build_eval_cases,
    EvalCase,
    ModelEvalReport,
    run_cpu_eval,
    run_gpu_eval,
    MODELS,
    FIXTURES,
    EVAL_CASES,
    build_prompt,
)


def test_fixture_count():
    """Test that we have the expected number of fixtures."""
    cases = list(build_eval_cases())
    assert len(cases) >= 250, f"Expected at least 250 cases, got {len(cases)}"
    valid = sum(1 for f in cases if f.expected_rejection is False)
    invalid = sum(1 for f in cases if f.expected_rejection is True)
    assert valid >= 10, f"Expected at least 10 valid fixtures, got {valid}"
    assert invalid >= 5, f"Expected at least 5 invalid fixtures, got {invalid}"
    print("✓ Fixture count test passed")


def test_model_configs():
    """Test model configurations."""
    assert len(MODELS) == 4, f"Expected 4 models, got {len(MODELS)}"
    
    model_ids = [m.model_id for m in MODELS]
    assert "qwen3.5:0.8b" in model_ids
    assert "qwen3.5:2b" in model_ids
    assert "qwen3.5:4b-q4_K_M" in model_ids
    assert "qwen3.5:9b" in model_ids
    
    tiers = [m.tier for m in MODELS]
    assert tiers.count("classifier_only") == 1
    assert tiers.count("planner") == 3
    
    print("✓ Model configs test passed")


def test_fixture_structure():
    """Test fixture structure."""
    cases = list(build_eval_cases())
    for fixture in cases:
        assert hasattr(fixture, "family")
        assert hasattr(fixture, "action")
        assert hasattr(fixture, "arguments")
        assert hasattr(fixture, "expected_tool")
        assert hasattr(fixture, "expected_rejection")
        assert hasattr(fixture, "arguments")
        assert hasattr(fixture, "expected_rejection")
        assert isinstance(fixture.arguments, dict)
        assert isinstance(fixture.expected_rejection, bool)
        
        if not fixture.expected_rejection:
            assert fixture.expected_tool is not None
        else:
            assert fixture.expected_tool is None
    
    print("✓ Fixture structure test passed")


def test_build_prompt():
    """Test prompt building."""
    fixture = {
        "family": "inbox",
        "action": "read",
        "arguments": {"query": "unread"},
        "expected_tool": "inbox.read",
        "expected_rejection": False
    }
    from run_eval import build_prompt
    prompt = build_prompt(fixture)
    
    assert "inbox" in prompt
    assert "inbox.read" in prompt
    assert "unread" in prompt
    assert "Arguments" in prompt
    assert "Expected tool" in prompt
    
    print("✓ Build prompt test passed")


async def test_mock_benchmark():
    """Test mock benchmark runs without errors."""
    from run_eval import run_cpu_eval
    
    config = MODELS[0]  # 0.8b classifier
    result = await run_cpu_eval(config.model_id, config.tier, mock=True)
    
    assert result.model_name == "qwen3.5:0.8b"
    assert result.tier == "classifier_only"
    # The test runs on 5 fixtures but the function runs on all 332 cases
    assert result.total_requests == len(EVAL_CASES)
    assert result.latency_p50_ms > 0
    assert result.latency_p95_ms >= result.latency_p50_ms
    assert result.throughput_tokens_per_sec > 0
    assert 0 <= result.tool_name_accuracy <= 1
    assert 0 <= result.field_accuracy <= 1
    assert result.peak_ram_mb > 0
    # peak_vram_mb is None for CPU evaluation
    assert result.peak_vram_mb is None or result.peak_vram_mb > 0
    assert len(result.case_results) == len(EVAL_CASES)
    
    print("✓ Mock benchmark test passed")


async def test_all_models_mock():
    """Test all models in mock mode."""
    from run_eval import run_cpu_eval
    
    results = []
    for config in MODELS:
        result = await run_cpu_eval(config.model_id, config.tier, mock=True)
        results.append(result)
        
        assert result.model_name == config.model_id
        assert result.tier == config.tier
        # The test runs on all fixtures (332 cases), not just 3
        assert result.total_requests == len(EVAL_CASES)
        assert len(result.case_results) == len(EVAL_CASES)
        assert 0 <= result.tool_name_accuracy <= 1
        assert 0 <= result.field_accuracy <= 1
    
    # Verify different tiers have different memory profiles
    # (for CPU tests, peak_vram_mb is None, so only check RAM)
    classifier = next(r for r in results if r.tier == "classifier_only")
    planner = next(r for r in results if r.tier == "planner")
    assert classifier.peak_ram_mb < planner.peak_ram_mb
    # VRAM is None for CPU, so skip VRAM comparison
    assert classifier.peak_vram_mb is None and planner.peak_vram_mb is None
    
    print("✓ All models mock benchmark passed")


def test_output_serialization():
    """Test that results can be serialized to JSON."""
    from run_eval import ModelEvalReport
    from datetime import datetime
    
    result = ModelEvalReport(
        model_name="test-model",
        tier="planner",
        timestamp="2026-01-01T00:00:00Z",
        hardware="cpu",
        latency_p50_ms=100.0,
        latency_p95_ms=200.0,
        latency_mean_ms=120.0,
        latency_stdev_ms=30.0,
        throughput_tokens_per_sec=50.0,
        total_tokens=1000,
        total_requests=10,
        peak_ram_mb=4000.0,
        peak_vram_mb=4500.0,
        tool_name_accuracy=0.95,
        field_accuracy=0.90,
        schema_rejection_rate=0.05,
        out_of_scope_false_call_rate=0.02,
        case_results=[],
        slice_metrics={},
    )
    
    d = result.to_dict()
    assert d["model_name"] == "test-model"
    assert d["latency_p50_ms"] == 100.0
    assert d["tool_name_accuracy"] == 0.95
    
    # Verify JSON serializable
    json_str = json.dumps(d)
    assert "test-model" in json_str
    
    print("✓ Output serialization test passed")


async def run_all_tests():
    """Run all tests."""
    print("="*60)
    print("Lab 11 Tests: Four-Model Benchmark")
    print("="*60)
    
    test_fixture_count()
    test_model_configs()
    test_fixture_structure()
    test_build_prompt()
    test_output_serialization()
    
    await test_mock_benchmark()
    await test_all_models_mock()
    
    print("\n✅ All Lab 11 tests passed!")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
