#!/usr/bin/env python3
"""Tests for Lab 4: Agent workflow with injected hallucination."""

import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from run_lab import (
    run_lab_workflow,
    LabWorkflowState,
    WorkflowStep,
    MockMCPClient,
    HallucinationValidator,
)


async def test_normal_workflow_passes_verification():
    """Normal workflow (no hallucination) should pass verification."""
    result = await run_lab_workflow(inject_hallucination=False)
    
    assert result["verification_status"] == "pass", f"Expected pass, got {result['verification_status']}"
    assert result["hallucination_detected"] is False
    print("✓ Normal workflow passes verification")


async def test_hallucination_workflow_fails_verification():
    """Workflow with hallucination should fail verification."""
    result = await run_lab_workflow(inject_hallucination=True)
    
    assert result["verification_status"] == "fail", f"Expected fail, got {result['verification_status']}"
    assert result["hallucination_detected"] is True
    print("✓ Hallucination workflow fails verification")


async def test_validator_catches_hallucination():
    """The validator should catch the injected lie."""
    from run_lab import MockMCPClient, HallucinationValidator
    from orchestrator.workflows.state import UntrustedPayload
    
    mcp_client = MockMCPClient(inject_hallucination=True)
    validator = HallucinationValidator()
    
    # Get hallucinated output
    raw_output = await mcp_client.call_tool("inbox.read", {"query": "unread", "limit": 10})
    
    # Validate
    verification = validator.validate_output("inbox.read", raw_output)
    
    assert verification.status == "fail"
    assert "contradict" in verification.reason.lower()
    print("✓ Validator catches hallucinated output")


async def test_mcp_client_injects_hallucination():
    """MCP client should inject hallucination when enabled."""
    client_normal = MockMCPClient(inject_hallucination=False)
    client_hallucination = MockMCPClient(inject_hallucination=True)
    
    normal_output = await client_normal.call_tool("inbox.read", {"query": "unread"})
    hallucinated_output = await client_hallucination.call_tool("inbox.read", {"query": "unread"})
    
    # Normal output should have normal messages
    assert "Normal email" in str(normal_output)
    
    # Hallucinated output should have hallucinated content
    assert "Secret quarterly results" in str(hallucinated_output)
    assert "admin@company.com" in str(hallucinated_output)
    print("✓ MCP client injects hallucination when enabled")


async def test_untrusted_payload_wrapping():
    """Tool outputs should be wrapped in UntrustedPayload."""
    from run_lab import MockMCPClient
    from orchestrator.workflows.state import UntrustedPayload
    
    client = MockMCPClient(inject_hallucination=False)
    raw_output = await client.call_tool("inbox.read", {"query": "unread"})
    
    untrusted = UntrustedPayload(
        data=raw_output,
        source_tool="inbox.read",
        trusted=False
    )
    
    assert untrusted.source_tool == "inbox.read"
    assert untrusted.trusted is False
    assert untrusted.data == raw_output
    
    # Test serialization
    d = untrusted.to_dict()
    assert d["source_tool"] == "inbox.read"
    assert d["trusted"] is False
    assert d["data"] == raw_output
    print("✓ UntrustedPayload wrapping works")


async def test_evidence_store():
    """Test evidence store stores expected patterns."""
    from run_lab import HallucinationValidator
    
    validator = HallucinationValidator()
    
    # The validator should have recorded expected evidence
    evidence = validator.evidence_store.get_evidence("inbox.read")
    assert evidence is not None
    assert evidence.tool == "inbox.read"
    assert "messages" in evidence.output_pattern
    print("✓ Evidence store stores expected patterns")


async def test_verification_result_types():
    """Test all three verification result types."""
    from run_lab import HallucinationValidator
    from orchestrator.workflows.state import UntrustedPayload
    
    validator = HallucinationValidator()
    
    # Pass case
    expected = {"messages": [{"id": "msg-1", "from": "user@example.com", "subject": "Hello", "body": "Normal email"}]}
    result_pass = validator.validate_output("inbox.read", expected)
    assert result_pass.status == "pass"
    
    # Fail case (hallucination)
    hallucinated = {"messages": [{"id": "msg-1", "from": "admin@company.com", "subject": "Secret", "body": "Q3 revenue: $50M"}]}
    result_fail = validator.validate_output("inbox.read", hallucinated)
    assert result_fail.status == "fail"
    assert "contradict" in result_fail.reason.lower()
    
    # Unknown case (no evidence for this tool)
    result_unknown = validator.validate_output("unknown.tool", {"data": "test"})
    assert result_unknown.status == "unknown"
    assert "no evidence" in result_unknown.reason.lower()
    
    print("✓ All three verification result types work")


async def run_all_tests():
    """Run all lab tests."""
    print("="*60)
    print("Lab 4 Tests: Agent Workflow with Hallucination Detection")
    print("="*60)
    
    await test_normal_workflow_passes_verification()
    await test_hallucination_workflow_fails_verification()
    await test_validator_catches_hallucination()
    await test_mcp_client_injects_hallucination()
    await test_untrusted_payload_wrapping()
    await test_evidence_store()
    await test_verification_result_types()
    
    print("\n✅ All Lab 4 tests passed!")


if __name__ == "__main__":
    asyncio.run(run_all_tests())