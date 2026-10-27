#!/usr/bin/env python3
"""Tests for the NOVA deterministic fake model."""

import json
import subprocess
import sys
from pathlib import Path


FAKE_MODEL = Path(__file__).parent / "fake_model.py"


def run_fake_model(scenario: str, input_data: dict = None) -> dict:
    """Run the fake model and return parsed JSON output."""
    input_json = json.dumps(input_data or {})
    result = subprocess.run(
        [sys.executable, str(FAKE_MODEL), "--scenario", scenario, "--input", input_json],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Fake model failed: {result.stderr}")
    return json.loads(result.stdout)


def test_happy_path():
    """Test happy path returns valid tool call."""
    response = run_fake_model("happy_path", {"action": "inbox.read", "user_id": "user-123"})
    
    assert response["schema_version"] == "1.0"
    assert response["user_id"] == "user-123"
    assert len(response["steps"]) == 1
    step = response["steps"][0]
    assert step["tool"] == "inbox.read"
    assert step["arguments"] == {"query": "unread", "limit": 10}
    assert step["requires_approval"] is False
    assert step["idempotency_key"] is None
    print("✓ happy_path test passed")


def test_happy_path_approval_required():
    """Test that tier3 tools require approval."""
    response = run_fake_model("happy_path", {"action": "inbox.send", "user_id": "user-123"})
    
    step = response["steps"][0]
    assert step["tool"] == "inbox.send"
    assert step["requires_approval"] is True
    assert step["idempotency_key"] is not None
    assert len(step["idempotency_key"]) == 16
    print("✓ happy_path approval test passed")


def test_wrong_tool():
    """Test wrong_tool scenario returns unregistered tool."""
    response = run_fake_model("wrong_tool")
    
    step = response["steps"][0]
    assert step["tool"] == "nonexistent.tool"
    print("✓ wrong_tool test passed")


def test_invalid_args():
    """Test invalid_args scenario returns invalid arguments."""
    response = run_fake_model("invalid_args")
    
    step = response["steps"][0]
    assert step["tool"] == "inbox.read"
    assert step["arguments"] == "not an object"
    print("✓ invalid_args test passed")


def test_out_of_scope():
    """Test out_of_scope scenario returns unsupported tool."""
    response = run_fake_model("out_of_scope")
    
    step = response["steps"][0]
    assert step["tool"] == "admin.delete_user"
    print("✓ out_of_scope test passed")


def test_injection():
    """Test injection scenario returns injected arguments."""
    response = run_fake_model("injection")
    
    step = response["steps"][0]
    assert step["tool"] == "inbox.read"
    assert "rm -rf" in step["arguments"]["query"]
    print("✓ injection test passed")


def test_multi_turn():
    """Test multi_turn scenario returns multiple steps."""
    response = run_fake_model("multi_turn")
    
    assert len(response["steps"]) == 3
    assert response["steps"][0]["tool"] == "inbox.read"
    assert response["steps"][1]["tool"] == "inbox.draft"
    assert response["steps"][2]["tool"] == "inbox.send"
    assert response["steps"][2]["requires_approval"] is True
    print("✓ multi_turn test passed")


def test_idempotency_key_deterministic():
    """Test that idempotency keys are deterministic for same input."""
    response1 = run_fake_model("happy_path", {"action": "inbox.send"})
    response2 = run_fake_model("happy_path", {"action": "inbox.send"})
    
    key1 = response1["steps"][0]["idempotency_key"]
    key2 = response2["steps"][0]["idempotency_key"]
    assert key1 == key2, "Idempotency keys should be deterministic"
    print("✓ idempotency key determinism test passed")


def test_all_scenarios():
    """Run all scenario tests."""
    test_happy_path()
    test_happy_path_approval_required()
    test_wrong_tool()
    test_invalid_args()
    test_out_of_scope()
    test_injection()
    test_multi_turn()
    test_idempotency_key_deterministic()
    print("\n✓ All fake model tests passed!")


if __name__ == "__main__":
    test_all_scenarios()