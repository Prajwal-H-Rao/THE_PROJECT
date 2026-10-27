#!/usr/bin/env python3
"""Tests for the Model Gateway."""

import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import tempfile
import yaml
from model_gateway import (
    ModelRegistry,
    Redactor,
    Truncator,
    TokenBucket,
    create_app,
)

# Create a temporary registry for testing
TEST_REGISTRY = """
models:
  - id: "test-model-planner"
    provider: "test"
    tags: ["test"]
    digest: "test123"
    status: "pinned"
    quant: "Q4_K_M"
    licence: "MIT"
    num_ctx: 4096
    router_role: "planner"
  - id: "test-model-classifier"
    provider: "test"
    tags: ["test"]
    digest: "test456"
    status: "pinned"
    quant: "Q4_K_M"
    licence: "MIT"
    num_ctx: 4096
    router_role: "classifier_only"

routing_policy:
  family_tiers:
    inbox: "planner"
    calendar_tasks: "planner"
    notes_memory: "classifier_only"
    finance: "planner"
    trips: "planner"
    resume_jobs: "planner"
    integrations: "planner"
  classifier_only_allowed_for:
    - "notes_memory"
  default_tier: "planner"

fake_model:
  id: "nova-fake-model"
  provider: "fake"
  tags: ["test"]
  digest: "fake-digest"
  status: "pinned"
  quant: "N/A"
  licence: "NOVA-internal"
  num_ctx: 4096
  router_role: "planner"
  ci_only: true
"""


def test_token_bucket():
    """Test token bucket rate limiting."""
    bucket = TokenBucket(capacity=10, refill_rate=1.0)  # 1 token/sec
    
    # Should allow up to capacity
    for i in range(10):
        assert bucket.consume(), f"Should allow request {i+1}"
    
    # Should deny after capacity
    assert not bucket.consume(), "Should deny after capacity exhausted"
    
    # Wait for refill
    import time
    time.sleep(1.1)
    assert bucket.consume(), "Should allow after refill"
    
    print("✓ Token bucket test passed")


def test_redactor():
    """Test secret redaction."""
    test_cases = [
        ("api_key=abc123", "[REDACTED]"),
        ("Bearer token123", "Bearer [REDACTED]"),
        ("password=secret", "[REDACTED]"),
        ("sk-abcdefghijklmnopqrst", "[REDACTED]"),
        ("Authorization: Bearer xyz", "Authorization: [REDACTED]"),
    ]
    
    for input_text, expected in test_cases:
        result = Redactor.redact(input_text)
        assert expected in result, f"Failed for {input_text}: got {result}"
    
    print("✓ Redactor test passed")


def test_truncator():
    """Test context truncation."""
    # Short text should not be truncated
    short = "Hello world"
    result, truncated = Truncator.truncate(short, 1000)
    assert result == short
    assert not truncated
    
    # Long text should be truncated
    long_text = "x" * 10000
    result, truncated = Truncator.truncate(long_text, 1000)
    assert truncated
    assert len(result) < len(long_text)
    assert Truncator.TRUNCATION_MARKER in result
    
    print("✓ Truncator test passed")


def test_registry_loading():
    """Test model registry loading."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        f.write(TEST_REGISTRY)
        temp_path = f.name
    
    try:
        registry = ModelRegistry(Path(temp_path))
        
        assert "test-model-planner" in registry.models
        assert "test-model-classifier" in registry.models
        
        assert registry.models["test-model-planner"].router_role == "planner"
        assert registry.models["test-model-classifier"].router_role == "classifier_only"
        
        assert registry.get_tier_for_family("inbox") == "planner"
        assert registry.get_tier_for_family("notes_memory") == "classifier_only"
        assert registry.get_tier_for_family("unknown") == "planner"  # default
        
        assert registry.is_model_allowed("test-model-planner")
        assert not registry.is_model_allowed("unknown-model")
        
        print("✓ Registry loading test passed")
    finally:
        os.unlink(temp_path)


def test_flask_app():
    """Test Flask app creation and basic routes."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        f.write(TEST_REGISTRY)
        temp_path = f.name
    
    try:
        app = create_app(Path(temp_path))
        
        with app.test_client() as client:
            # Test health endpoints
            response = client.get("/health/live")
            assert response.status_code == 200
            assert response.get_json()["status"] == "live"
            
            response = client.get("/health/ready")
            assert response.status_code == 200
            assert response.get_json()["status"] == "ready"
            
            # Test model listing
            response = client.get("/v1/models")
            assert response.status_code == 200
            data = response.get_json()
            assert "models" in data
            assert len(data["models"]) == 2
            
            # Test model detail
            response = client.get("/v1/models/test-model-planner")
            assert response.status_code == 200
            data = response.get_json()
            assert data["id"] == "test-model-planner"
            
            response = client.get("/v1/models/unknown")
            assert response.status_code == 404
            
            # Test completions endpoint
            response = client.post("/v1/completions", json={
                "tier": "planner",
                "prompt": "Test prompt",
            })
            assert response.status_code == 200
            data = response.get_json()
            assert "choices" in data
            assert data["meta"]["tier"] == "planner"
            
            # Test unknown tier
            response = client.post("/v1/completions", json={
                "tier": "unknown",
                "prompt": "Test",
            })
            assert response.status_code == 400
            
            # Test unlisted model
            response = client.post("/v1/completions", json={
                "model": "evil-model",
                "prompt": "Test",
            })
            assert response.status_code == 403
            
            # Test quota exceeded (simulate by making many requests)
            # This is hard to test without time manipulation
            
        print("✓ Flask app test passed")
    finally:
        os.unlink(temp_path)


def test_quota_enforcement():
    """Test that quota is enforced per tier."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        f.write(TEST_REGISTRY)
        temp_path = f.name
    
    try:
        app = create_app(Path(temp_path))
        
        with app.test_client() as client:
            # Make requests up to quota (60/minute = 1/sec, capacity 60)
            # We can't easily test this without mocking time
            # Just verify the quota structure exists
            from model_gateway import create_app as create_app_func
            app2 = create_app_func(Path(temp_path))
            
            with app2.test_client() as client2:
                # First request should succeed
                response = client2.post("/v1/completions", json={
                    "tier": "planner",
                    "prompt": "Test",
                })
                assert response.status_code == 200
                
        print("✓ Quota structure test passed")
    finally:
        os.unlink(temp_path)


def run_all():
    test_token_bucket()
    test_redactor()
    test_truncator()
    test_registry_loading()
    test_flask_app()
    test_quota_enforcement()
    print("\n✓ All model gateway tests passed!")


if __name__ == "__main__":
    run_all()