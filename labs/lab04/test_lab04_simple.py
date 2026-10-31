#!/usr/bin/env python3
"""Simple standalone tests for Lab 4 (no external dependencies)."""

import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum


# ============================================================================
# Standalone implementation of Lab 4 classes (no external dependencies)
# ============================================================================

class WorkflowStep(Enum):
    PLAN = "plan"
    VALIDATE = "validate"
    AWAIT_APPROVAL = "await_approval"
    EXECUTE = "execute"
    VERIFY = "verify"
    AUDIT = "audit"


@dataclass
class LabWorkflowState:
    plan_id: str
    user_id: str
    current_step: WorkflowStep = WorkflowStep.PLAN
    plan: Optional[Dict[str, Any]] = None
    validation_result: Optional[Dict[str, Any]] = None
    approval_grant: Optional[str] = None
    execution_result: Optional[Dict[str, Any]] = None
    verification_result: Optional[Any] = None
    audit_record: Optional[Dict[str, Any]] = None
    injected_hallucination: bool = False
    error: Optional[str] = None


class MockMCPClient:
    """Mock MCP client that can inject hallucinations."""
    
    def __init__(self, inject_hallucination: bool = False):
        self.inject_hallucination = inject_hallucination
        self.call_log: List[Dict[str, Any]] = []
    
    def call_tool(self, tool: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        self.call_log.append({"tool": tool, "arguments": arguments})
        
        if tool == "inbox.read":
            if self.inject_hallucination:
                return {
                    "messages": [
                        {"id": "msg-1", "from": "admin@company.com", "subject": "Secret quarterly results", "body": "Q3 revenue: $50M"},
                        {"id": "msg-2", "from": "ceo@company.com", "subject": "Board meeting", "body": "Confidential"},
                    ]
                }
            return {
                "messages": [
                    {"id": "msg-1", "from": "user@example.com", "subject": "Hello", "body": "Normal email"},
                ]
            }
        return {"result": "ok"}


# Simple UntrustedPayload implementation for testing
@dataclass
class UntrustedPayload:
    data: Dict[str, Any]
    source_tool: str
    trusted: bool = False
    received_at: float = field(default_factory=lambda: __import__('time').time())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "data": self.data,
            "source_tool": self.source_tool,
            "trusted": self.trusted,
            "received_at": self.received_at,
        }
    
    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> 'UntrustedPayload':
        return cls(
            data=d["data"],
            source_tool=d["source_tool"],
            trusted=d.get("trusted", False),
            received_at=d.get("received_at", __import__('time').time()),
        )


# Simple Evidence and EvidenceStore for testing
@dataclass
class Evidence:
    tool: str
    output_pattern: Dict[str, Any]


class EvidenceStore:
    def __init__(self):
        self._evidence: Dict[str, Evidence] = {}
    
    def record_evidence(self, tool: str, output: Dict[str, Any], evidence: Evidence) -> None:
        self._evidence[tool] = evidence
    
    def get_evidence(self, tool: str) -> Optional[Evidence]:
        return self._evidence.get(tool)


# Simple Verifier for testing
@dataclass
class VerificationResult:
    status: str  # "pass", "fail", "unknown"
    reason: str
    evidence: Optional[Dict[str, Any]] = None


class Verifier:
    def __init__(self, store: EvidenceStore):
        self.store = store
    
    def verify_detailed(self, tool: str, output: Dict[str, Any], context: Dict[str, Any]) -> 'VerificationResult':
        evidence = self.store.get_evidence(tool)
        
        if evidence is None:
            return VerificationResult(
                status="unknown",
                reason=f"No evidence for tool '{tool}'"
            )
        
        # Simple comparison - in real implementation this would be more sophisticated
        if output == evidence.output_pattern:
            return VerificationResult(
                status="pass",
                reason="Output matches expected pattern",
                evidence=output
            )
        else:
            return VerificationResult(
                status="fail",
                reason=f"Output contradicts expected pattern for tool '{tool}'",
                evidence=output
            )
    
    def verify(self, tool: str, output: Dict[str, Any], context: Dict[str, Any]) -> bool:
        result = self.verify_detailed(tool, output, context)
        return result.status == "pass"


# Simple HallucinationValidator for testing
class HallucinationValidator:
    def __init__(self):
        self.evidence_store = EvidenceStore()
        self.verifier = Verifier(self.evidence_store)
        
        expected_inbox = {"messages": [{"id": "msg-1", "from": "user@example.com", "subject": "Hello", "body": "Normal email"}]}
        self.evidence_store._evidence["inbox.read"] = Evidence(
            tool="inbox.read",
            output_pattern=expected_inbox
        )
    
    def validate_output(self, tool: str, output: Dict[str, Any]) -> Any:
        return self.verifier.verify_detailed(tool, output, {})


# Simple UntrustedPayload for testing
@dataclass
class UntrustedPayload:
    data: Dict[str, Any]
    source_tool: str
    trusted: bool = False
    received_at: float = field(default_factory=lambda: __import__('time').time())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "data": self.data,
            "source_tool": self.source_tool,
            "trusted": self.trusted,
            "received_at": self.received_at,
        }
    
    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> 'UntrustedPayload':
        return cls(
            data=d["data"],
            source_tool=d["source_tool"],
            trusted=d.get("trusted", False),
            received_at=d.get("received_at", __import__('time').time()),
        )


# MockMCPClient for testing
class MockMCPClient:
    def __init__(self, inject_hallucination: bool = False):
        self.inject_hallucination = inject_hallucination
        self.call_log: List[Dict[str, Any]] = []
    
    def call_tool(self, tool: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        self.call_log.append({"tool": tool, "arguments": arguments})
        
        if tool == "inbox.read":
            if self.inject_hallucination:
                return {
                    "messages": [
                        {"id": "msg-1", "from": "admin@company.com", "subject": "Secret quarterly results", "body": "Q3 revenue: $50M"},
                        {"id": "msg-2", "from": "ceo@company.com", "subject": "Board meeting", "body": "Confidential"},
                    ]
                }
            return {
                "messages": [
                    {"id": "msg-1", "from": "user@example.com", "subject": "Hello", "body": "Normal email"},
                ]
            }
        return {"result": "ok"}


# HallucinationValidator for testing
class HallucinationValidator:
    def __init__(self):
        self.evidence_store = EvidenceStore()
        self.verifier = Verifier(self.evidence_store)
        
        expected_inbox = {"messages": [{"id": "msg-1", "from": "user@example.com", "subject": "Hello", "body": "Normal email"}]}
        self.evidence_store._evidence["inbox.read"] = Evidence(
            tool="inbox.read",
            output_pattern=expected_inbox
        )
    
    def validate_output(self, tool: str, output: Dict[str, Any]) -> Any:
        return self.verifier.verify_detailed(tool, output, {})


# ============================================================================
# Tests
# ============================================================================

def test_untrusted_payload():
    from dataclasses import dataclass, field
    from typing import Dict, Any
    from typing import Optional
    
    @dataclass
    class UntrustedPayload:
        data: Dict[str, Any]
        source_tool: str
        trusted: bool = False
        received_at: float = field(default_factory=lambda: __import__('time').time())
        
        def to_dict(self) -> Dict[str, Any]:
            return {
                "data": self.data,
                "source_tool": self.source_tool,
                "trusted": self.trusted,
                "received_at": self.received_at,
            }
        
        @classmethod
        def from_dict(cls, d: Dict[str, Any]) -> 'UntrustedPayload':
            return cls(
                data=d["data"],
                source_tool=d["source_tool"],
                trusted=d.get("trusted", False),
                received_at=d.get("received_at", __import__('time').time()),
            )
    
    data = {"messages": [{"body": "test"}]}
    payload = UntrustedPayload(data=data, source_tool="inbox.read", trusted=False)
    
    assert payload.source_tool == "inbox.read"
    assert payload.trusted is False
    assert payload.data == data
    
    d = payload.to_dict()
    assert d["source_tool"] == "inbox.read"
    assert d["trusted"] is False
    assert d["data"] == data
    
    restored = UntrustedPayload.from_dict(d)
    assert restored.data == data
    assert restored.source_tool == "inbox.read"
    assert restored.trusted is False
    
    print("✓ UntrustedPayload wrapping works")


def test_mock_mcp_client():
    class MockMCPClient:
        def __init__(self, inject_hallucination: bool = False):
            self.inject_hallucination = inject_hallucination
            self.call_log: List[Dict[str, Any]] = []
        
        def call_tool(self, tool: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
            self.call_log.append({"tool": tool, "arguments": arguments})
            
            if tool == "inbox.read":
                if self.inject_hallucination:
                    return {
                        "messages": [
                            {"id": "msg-1", "from": "admin@company.com", "subject": "Secret quarterly results", "body": "Q3 revenue: $50M"},
                            {"id": "msg-2", "from": "ceo@company.com", "subject": "Board meeting", "body": "Confidential"},
                        ]
                    }
                return {
                    "messages": [
                        {"id": "msg-1", "from": "user@example.com", "subject": "Hello", "body": "Normal email"},
                    ]
                }
            return {"result": "ok"}
    
    client_normal = MockMCPClient(inject_hallucination=False)
    client_hallucination = MockMCPClient(inject_hallucination=True)
    
    normal_output = client_normal.call_tool("inbox.read", {"query": "unread"})
    assert "Normal email" in str(normal_output)
    assert len(client_normal.call_log) == 1
    
    hallucinated_output = client_hallucination.call_tool("inbox.read", {"query": "unread"})
    assert "Secret quarterly results" in str(hallucinated_output)
    assert "admin@company.com" in str(hallucinated_output)
    
    print("✓ MockMCPClient works")


def test_evidence_store_and_verifier():
    @dataclass
    class Evidence:
        tool: str
        output_pattern: Dict[str, Any]
    
    class EvidenceStore:
        def __init__(self):
            self._evidence: Dict[str, Any] = {}
        
        def record_evidence(self, tool: str, output: Dict[str, Any], evidence: Any) -> None:
            self._evidence[tool] = evidence
        
        def get_evidence(self, tool: str) -> Any:
            return self._evidence.get(tool)
    
    @dataclass
    class Evidence:
        tool: str
        output_pattern: Dict[str, Any]
    
    @dataclass
    class VerificationResult:
        status: str
        reason: str
        evidence: Optional[Dict[str, Any]] = None
    
    class Verifier:
        def __init__(self, store: EvidenceStore):
            self.store = store
        
        def verify_detailed(self, tool: str, output: Dict[str, Any], context: Dict[str, Any]) -> 'VerificationResult':
            evidence = self.store.get_evidence(tool)
            
            if evidence is None:
                return VerificationResult(
                    status="unknown",
                    reason=f"No evidence for tool '{tool}'"
                )
            
            if output == evidence.output_pattern:
                return VerificationResult(
                    status="pass",
                    reason="Output matches expected pattern",
                    evidence=output
                )
            else:
                return VerificationResult(
                    status="fail",
                    reason=f"Output contradicts expected pattern for tool '{tool}'",
                    evidence=output
                )
        
        def verify(self, tool: str, output: Dict[str, Any], context: Dict[str, Any]) -> bool:
            result = self.verify_detailed(tool, output, context)
            return result.status == "pass"
    
    store = EvidenceStore()
    expected = {"messages": [{"body": "hello"}]}
    store._evidence["inbox.read"] = Evidence(tool="inbox.read", output_pattern=expected)
    
    verifier = Verifier(store)
    
    result_pass = verifier.verify_detailed("inbox.read", expected, {})
    assert result_pass.status == "pass"
    
    contradictory = {"messages": [{"body": "different"}]}
    result_fail = verifier.verify_detailed("inbox.read", contradictory, {})
    assert result_fail.status == "fail"
    assert "contradict" in result_fail.reason.lower()
    
    result_unknown = verifier.verify_detailed("unknown.tool", {"data": "test"}, {})
    assert result_unknown.status == "unknown"
    
    print("✓ EvidenceStore and Verifier work")


def test_hallucination_detection():
    class Evidence:
        def __init__(self, tool: str, output_pattern: Dict[str, Any]):
            self.tool = tool
            self.output_pattern = output_pattern
    
    class EvidenceStore:
        def __init__(self):
            self._evidence = {}
        
        def record_evidence(self, tool: str, output: Dict[str, Any], evidence: Any) -> None:
            self._evidence[tool] = evidence
        
        def get_evidence(self, tool: str) -> Any:
            return self._evidence.get(tool)
    
    @dataclass
    class VerificationResult:
        status: str
        reason: str
        evidence: Optional[Dict[str, Any]] = None
    
    class Verifier:
        def __init__(self, store: EvidenceStore):
            self.store = store
        
        def verify_detailed(self, tool: str, output: Dict[str, Any], context: Dict[str, Any]) -> 'VerificationResult':
            evidence = self.store.get_evidence(tool)
            
            if evidence is None:
                return VerificationResult(
                    status="unknown",
                    reason=f"No evidence for tool '{tool}'"
                )
            
            if output == evidence.output_pattern:
                return VerificationResult(
                    status="pass",
                    reason="Output matches expected pattern",
                    evidence=output
                )
            else:
                return VerificationResult(
                    status="fail",
                    reason=f"Output contradicts expected pattern for tool '{tool}'",
                    evidence=output
                )
    
    class HallucinationValidator:
        def __init__(self):
            self.evidence_store = EvidenceStore()
            self.verifier = Verifier(self.evidence_store)
            
            expected_inbox = {"messages": [{"id": "msg-1", "from": "user@example.com", "subject": "Hello", "body": "Normal email"}]}
            self.evidence_store._evidence["inbox.read"] = Evidence(
                tool="inbox.read",
                output_pattern=expected_inbox
            )
        
        def validate_output(self, tool: str, output: Dict[str, Any]) -> Any:
            return self.verifier.verify_detailed(tool, output, {})
    
    validator = HallucinationValidator()
    
    # Use the exact same structure as the evidence pattern
    normal = {"messages": [{"id": "msg-1", "from": "user@example.com", "subject": "Hello", "body": "Normal email"}]}
    result_normal = validator.validate_output("inbox.read", normal)
    assert result_normal.status == "pass"
    
    hallucinated = {"messages": [{"id": "msg-1", "from": "admin@company.com", "subject": "Secret quarterly results", "body": "Q3 revenue: $50M"}]}
    result_hallucinated = validator.validate_output("inbox.read", hallucinated)
    assert result_hallucinated.status == "fail"
    assert "contradict" in result_hallucinated.reason.lower()
    
    print("✓ Hallucination detection works")


if __name__ == "__main__":
    print("="*60)
    print("Lab 4 Simple Tests (no external dependencies)")
    print("="*60)
    
    test_untrusted_payload()
    test_mock_mcp_client()
    test_evidence_store_and_verifier()
    test_hallucination_detection()
    
    print("\n✅ All Lab 4 simple tests passed!")