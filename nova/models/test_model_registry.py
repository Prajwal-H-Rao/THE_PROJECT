#!/usr/bin/env python3
"""Tests for the model registry validation."""

import yaml
from pathlib import Path


REGISTRY_PATH = Path(__file__).parent / "model-registry.yaml"


def load_registry():
    """Load the model registry YAML."""
    with open(REGISTRY_PATH) as f:
        return yaml.safe_load(f)


def test_registry_structure():
    """Test that registry has required top-level keys."""
    registry = load_registry()
    
    assert "models" in registry, "Registry must have 'models' key"
    assert "routing_policy" in registry, "Registry must have 'routing_policy' key"
    assert "fake_model" in registry, "Registry must have 'fake_model' key"
    print("✓ Registry structure test passed")


def test_model_rows():
    """Test each model row has required fields."""
    registry = load_registry()
    models = registry["models"]
    
    required_fields = ["id", "provider", "tags", "digest", "status", "quant", "licence", "num_ctx", "router_role"]
    
    for model in models:
        for field in required_fields:
            assert field in model, f"Model {model.get('id', 'unknown')} missing field: {field}"
        
        # Validate status
        assert model["status"] in ["pinned", "pending_pin"], f"Invalid status for {model['id']}"
        
        # Validate router_role
        assert model["router_role"] in ["classifier_only", "planner"], f"Invalid router_role for {model['id']}"
        
        # Validate num_ctx is integer
        assert isinstance(model["num_ctx"], int), f"num_ctx must be integer for {model['id']}"
        
        # Validate tags is list
        assert isinstance(model["tags"], list), f"tags must be list for {model['id']}"
    
    print("✓ Model rows test passed")


def test_classifier_only_models():
    """Test that classifier_only models are correctly marked."""
    registry = load_registry()
    models = registry["models"]
    
    classifier_only = [m for m in models if m["router_role"] == "classifier_only"]
    planners = [m for m in models if m["router_role"] == "planner"]
    
    # Should have at least one classifier_only (0.8b)
    classifier_ids = [m["id"] for m in classifier_only]
    assert "qwen3.5:0.8b" in classifier_ids, "0.8b should be classifier_only"
    
    # Embeddings should be classifier_only
    embedding_ids = [m["id"] for m in classifier_only if "embeddings" in m["tags"]]
    assert len(embedding_ids) >= 2, "Should have embedding models as classifier_only"
    
    # Planners should include 2b, 4b, 9b
    planner_ids = [m["id"] for m in planners]
    for model_id in ["qwen3.5:2b", "qwen3.5:4b", "qwen3.5:9b"]:
        assert model_id in planner_ids, f"{model_id} should be planner"
    
    print("✓ Classifier-only models test passed")


def test_routing_policy():
    """Test routing policy has all canonical families."""
    registry = load_registry()
    policy = registry["routing_policy"]
    
    canonical_families = [
        "inbox", "calendar_tasks", "notes_memory", "finance",
        "trips", "resume_jobs", "integrations"
    ]
    
    assert "family_tiers" in policy, "Routing policy must have family_tiers"
    assert "classifier_only_allowed_for" in policy, "Routing policy must have classifier_only_allowed_for"
    assert "default_tier" in policy, "Routing policy must have default_tier"
    
    # All canonical families must have a tier
    for family in canonical_families:
        assert family in policy["family_tiers"], f"Family {family} missing from family_tiers"
        assert policy["family_tiers"][family] in ["planner", "classifier_only"], f"Invalid tier for {family}"
    
    # classifier_only_allowed_for should only contain notes_memory
    assert policy["classifier_only_allowed_for"] == ["notes_memory"], "Only notes_memory should allow classifier_only"
    
    # default_tier should be planner
    assert policy["default_tier"] == "planner", "Default tier should be planner"
    
    print("✓ Routing policy test passed")


def test_fake_model():
    """Test CI fake model row."""
    registry = load_registry()
    fake = registry["fake_model"]
    
    assert fake["id"] == "nova-fake-model"
    assert fake["provider"] == "fake"
    assert fake["status"] == "pinned"
    assert fake["ci_only"] is True
    assert fake["router_role"] == "planner"
    assert fake["digest"] == "fake-digest-for-ci"
    
    print("✓ Fake model test passed")


def test_digest_format():
    """Test that digests are 12-hex prefixes (for pending_pin) or full SHA256."""
    registry = load_registry()
    models = registry["models"]
    
    for model in models:
        digest = model["digest"]
        if model["status"] == "pending_pin":
            # Should be 12-hex prefix from ollama.com
            assert len(digest) == 12, f"Pending pin digest for {model['id']} should be 12 hex chars"
            assert all(c in "0123456789abcdef" for c in digest.lower()), f"Invalid hex in {model['id']} digest"
        elif model["status"] == "pinned":
            # Should be full 64-char SHA256 or the fake digest
            if model["id"] != "nova-fake-model":
                assert len(digest) == 64, f"Pinned digest for {model['id']} should be 64 hex chars"
                assert all(c in "0123456789abcdef" for c in digest.lower()), f"Invalid hex in {model['id']} digest"
    
    print("✓ Digest format test passed")


def test_all_tests():
    """Run all registry tests."""
    test_registry_structure()
    test_model_rows()
    test_classifier_only_models()
    test_routing_policy()
    test_fake_model()
    test_digest_format()
    print("\n✓ All model registry tests passed!")


if __name__ == "__main__":
    test_all_tests()