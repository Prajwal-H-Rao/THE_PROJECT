#!/usr/bin/env python3
"""Tests for Lab 11: Four-model benchmark."""

import sys
import asyncio
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from run_benchmark import (
    BenchmarkConfig,
    FIXTURES,
    MODELS,
    build_prompt,
    benchmark_model,
)


def test_fixture_count():
    """Test that we have the expected number of fixtures."""
    assert len(FIXTURES) >= 15, f"Expected at least 15 fixtures, got {len(FIXTURES)}"
    valid = sum(1 for f in FIXTURES if f["valid"])
    invalid = sum(1 for f in FIXTURES if not f["valid"])
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
    for fixture in FIXTURES:
        assert "family" in fixture
        assert "action" in fixture
        assert "arguments" in fixture
        assert "expected_tool" in fixture
        assert "valid" in fixture
        assert isinstance(fixture["arguments"], dict)
        assert isinstance(fixture["valid"], bool)
        
        if fixture["valid"]:
            assert fixture["expected_tool"] is not None
        else:
            assert fixture["expected_tool"] is None
    
    print("✓ Fixture structure test passed")


def test_build_prompt():
    """Test prompt building."""
    fixture = FIXTURES[0]
    prompt = build_prompt(fixture)
    
    assert "inbox" in prompt
    assert "inbox.read" in prompt
    assert "unread" in prompt
    assert "tool" in prompt
    assert "arguments" in prompt
    
    print("✓ Build prompt test passed")


async def test_mock_benchmark():
    """Test mock benchmark runs without errors."""
    from run_benchmark import benchmark_model
    
    config = MODELS[0]  # 0.8b classifier
    result = await benchmark_model(config, FIXTURES[:5], mock=True)
    
    assert result.model_id == "qwen3.5:0.8b"
    assert result.tier == "classifier_only"
    assert result.fixture_count == 5
    assert result.latency_p50_ms > 0
    assert result.latency_p95_ms >= result.latency_p50_ms
    assert result.throughput_tokens_per_sec > 0
    assert 0 <= result.tool_name_accuracy <= 1
    assert 0 <= result.field_accuracy <= 1
    assert result.peak_ram_mb > 0
    assert result.peak_vram_mb is not None and result.peak_vram_mb > 0
    assert len(result.fixture_results) == 5
    
    print("✓ Mock benchmark test passed")


async def test_all_models_mock():
    """Test all models in mock mode."""
    from run_benchmark import benchmark_model
    
    results = []
    for config in MODELS:
        result = await benchmark_model(config, FIXTURES[:3], mock=True)
        results.append(result)
        
        assert result.model_id == config.model_id
        assert result.tier == config.tier
        assert result.fixture_count == 3
        assert len(result.fixture_results) == 3
        assert 0 <= result.tool_name_accuracy <= 1
        assert 0 <= result.field_accuracy <= 1
    
    # Verify different tiers have different memory profiles
    classifier = next(r for r in results if r.tier == "classifier_only")
    planner = next(r for r in results if r.tier == "planner")
    assert classifier.peak_ram_mb < planner.peak_ram_mb
    assert classifier.peak_vram_mb < planner.peak_vram_mb
    
    print("✓ All models mock benchmark passed")


def test_output_serialization():
    """Test that results can be serialized to JSON."""
    from run_benchmark import BenchmarkResult
    from datetime import datetime
    
    result = BenchmarkResult(
        model_id="test",
        model_name="test-model",
        tier="planner",
        timestamp=datetime.utcnow().isoformat() + "Z",
        fixture_count=10,
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
        latencies_ms=[80, 90, 100, 110, 120, 130, 140, 150, 160, 170],
        fixture_results=[],
    )
    
    d = result.to_dict()
    assert d["model_id"] == "test"
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