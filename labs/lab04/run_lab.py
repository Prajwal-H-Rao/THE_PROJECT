#!/usr/bin/env python3
"""
Lab 4: Agent workflow with injected hallucination.

This lab demonstrates the Layer 7 independent verification:
- LangGraph stub workflow: plan → validate → await_approval → execute → verify → audit
- An injected hallucination in the tool output
- The validator catches the injected lie

Run: python run_lab.py
"""

import sys
import json
import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

# Add parent paths
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "services" / "agent-orchestrator"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "services" / "model-gateway"))

# Import NOVA modules
from orchestrator.workflows import run_workflow
from orchestrator.verify.verifier import Verifier, EvidenceStore, VerificationResult
from orchestrator.workflows.state import WorkflowStateData, UntrustedPayload, WorkflowState
from orchestrator.workflows.nodes import execute_node


class WorkflowStep(Enum):
    PLAN = "plan"
    VALIDATE = "validate"
    AWAIT_APPROVAL = "await_approval"
    EXECUTE = "execute"
    VERIFY = "verify"
    AUDIT = "audit"


@dataclass
class LabWorkflowState:
    """State for the lab workflow."""
    plan_id: str
    user_id: str
    current_step: WorkflowStep = WorkflowStep.PLAN
    plan: Optional[Dict[str, Any]] = None
    validation_result: Optional[Dict[str, Any]] = None
    approval_grant: Optional[str] = None
    execution_result: Optional[Dict[str, Any]] = None
    verification_result: Optional[VerificationResult] = None
    audit_record: Optional[Dict[str, Any]] = None
    injected_hallucination: bool = False
    error: Optional[str] = None


class MockMCPClient:
    """Mock MCP client that can inject hallucinations."""
    
    def __init__(self, inject_hallucination: bool = False):
        self.inject_hallucination = inject_hallucination
        self.call_log: List[Dict[str, Any]] = []
    
    async def call_tool(self, tool: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate MCP tool call."""
        self.call_log.append({"tool": tool, "arguments": arguments})
        
        # Normal response
        if tool == "inbox.read":
            if self.inject_hallucination:
                # Injected hallucination: claims to have read admin emails
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


class HallucinationValidator:
    """Validates tool outputs against expected patterns."""
    
    def __init__(self):
        self.evidence_store = EvidenceStore()
        self.verifier = Verifier(self.evidence_store)
        
        # Record expected patterns
        expected_inbox = {"messages": [{"id": "msg-1", "from": "user@example.com", "subject": "Hello", "body": "Normal email"}]}
        from orchestrator.verify.verifier import Evidence
        self.evidence_store.record_evidence(
            "inbox.read",
            expected_inbox,
            Evidence(tool="inbox.read", output_pattern=expected_inbox)
        )
    
    def validate_output(self, tool: str, output: Dict[str, Any]) -> VerificationResult:
        """Validate tool output against evidence."""
        return self.verifier.verify_detailed(tool, output, {})


async def run_lab_workflow(inject_hallucination: bool = False) -> Dict[str, Any]:
    """Run the complete lab workflow."""
    
    print(f"\n{'='*60}")
    print(f"Lab 4: Agent Workflow {'WITH' if inject_hallucination else 'WITHOUT'} Hallucination")
    print(f"{'='*60}")
    
    state = LabWorkflowState(
        plan_id="lab4-plan-001",
        user_id="lab-user-001"
    )
    
    mcp_client = MockMCPClient(inject_hallucination=inject_hallucination)
    validator = HallucinationValidator()
    
    # Step 1: PLAN
    print(f"\n[Step 1] {WorkflowStep.PLAN.value}: Planning workflow...")
    state.current_step = WorkflowStep.PLAN
    state.plan = {
        "plan_id": state.plan_id,
        "user_id": state.user_id,
        "steps": [
            {"tool": "inbox.read", "arguments": {"query": "unread", "limit": 10}}
        ]
    }
    print(f"  Plan created with {len(state.plan['steps'])} step(s)")
    
    # Step 2: VALIDATE
    print(f"\n[Step 2] {WorkflowStep.VALIDATE.value}: Validating plan...")
    state.current_step = WorkflowStep.VALIDATE
    # In real implementation, this would validate against tool catalogue
    state.validation_result = {"valid": True, "denials": []}
    print(f"  Plan validation: {'PASSED' if state.validation_result['valid'] else 'FAILED'}")
    
    # Step 3: AWAIT_APPROVAL
    print(f"\n[Step 3] {WorkflowStep.AWAIT_APPROVAL.value}: Awaiting approval...")
    state.current_step = WorkflowStep.AWAIT_APPROVAL
    # In real implementation, this would pause for human approval
    state.approval_grant = "grant-lab4-001"
    print(f"  Approval granted: {state.approval_grant}")
    
    # Step 4: EXECUTE
    print(f"\n[Step 4] {WorkflowStep.EXECUTE.value}: Executing plan...")
    state.current_step = WorkflowStep.EXECUTE
    
    for step in state.plan["steps"]:
        tool = step["tool"]
        arguments = step["arguments"]
        
        print(f"  Calling tool: {tool} with args: {arguments}")
        
        # Call MCP tool (with potential hallucination)
        raw_output = await mcp_client.call_tool(tool, arguments)
        
        # Wrap in UntrustedPayload (Layer 6)
        untrusted = UntrustedPayload(
            data=raw_output,
            source_tool=tool,
            trusted=False
        )
        
        state.execution_result = {
            "tool": tool,
            "arguments": arguments,
            "raw_output": raw_output,
            "untrusted_payload": untrusted.to_dict()
        }
        
        print(f"  Tool output wrapped as UntrustedPayload(trusted=False)")
    
    # Step 5: VERIFY (Layer 7 - Independent Verification)
    print(f"\n[Step 5] {WorkflowStep.VERIFY.value}: Independent verification...")
    state.current_step = WorkflowStep.VERIFY
    
    # Validate against expected patterns
    if state.execution_result:
        tool = state.execution_result["tool"]
        raw_output = state.execution_result["raw_output"]
        
        print(f"  Verifying {tool} output against evidence store...")
        verification = validator.validate_output(tool, raw_output)
        state.verification_result = verification
        
        print(f"  Verification status: {verification.status}")
        if verification.status == "fail":
            print(f"  REASON: {verification.reason}")
        elif verification.status == "unknown":
            print(f"  REASON: {verification.reason}")
    
    # Step 6: AUDIT (Layer 8 - Auditable Denials)
    print(f"\n[Step 6] {WorkflowStep.AUDIT.value}: Recording audit record...")
    state.current_step = WorkflowStep.AUDIT
    
    state.audit_record = {
        "plan_id": state.plan_id,
        "user_id": state.user_id,
        "steps": [
            {"step": s.value, "status": "completed"} for s in WorkflowStep
        ],
        "verification": {
            "status": state.verification_result.status if state.verification_result else "unknown",
            "reason": state.verification_result.reason if state.verification_result else None,
        },
        "hallucination_detected": state.verification_result.status == "fail" if state.verification_result else False,
    }
    
    print(f"  Audit record created")
    print(f"  Hallucination detected: {state.audit_record['hallucination_detected']}")
    
    return {
        "plan_id": state.plan_id,
        "hallucination_injected": inject_hallucination,
        "verification_status": state.verification_result.status if state.verification_result else "unknown",
        "hallucination_detected": state.audit_record["hallucination_detected"],
        "audit_record": state.audit_record,
    }


async def main():
    """Run both scenarios: with and without hallucination."""
    
    print("="*70)
    print("NOVA Lab 4: Agent Workflow with Hallucination Detection")
    print("="*70)
    
    # Scenario 1: Normal workflow (no hallucination)
    print("\n>>> SCENARIO 1: Normal workflow (no hallucination)")
    result_normal = await run_lab_workflow(inject_hallucination=False)
    
    # Scenario 2: Workflow with injected hallucination
    print("\n>>> SCENARIO 2: Workflow WITH injected hallucination")
    result_hallucination = await run_lab_workflow(inject_hallucination=True)
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"Normal workflow:     verification={result_normal['verification_status']}, hallucination_detected={result_normal['hallucination_detected']}")
    print(f"Hallucination run:   verification={result_hallucination['verification_status']}, hallucination_detected={result_hallucination['hallucination_detected']}")
    
    # Verify expectations
    success = True
    
    if result_normal["verification_status"] != "pass":
        print(f"❌ FAIL: Normal workflow should PASS verification, got {result_normal['verification_status']}")
        success = False
    else:
        print("✅ Normal workflow: PASS verification")
    
    if result_normal["hallucination_detected"]:
        print(f"❌ FAIL: Normal workflow should NOT detect hallucination")
        success = False
    else:
        print("✅ Normal workflow: No false positive hallucination detection")
    
    if result_hallucination["verification_status"] != "fail":
        print(f"❌ FAIL: Hallucination workflow should FAIL verification, got {result_hallucination['verification_status']}")
        success = False
    else:
        print("✅ Hallucination workflow: FAIL verification (caught)")
    
    if not result_hallucination["hallucination_detected"]:
        print(f"❌ FAIL: Hallucination workflow should detect hallucination")
        success = False
    else:
        print("✅ Hallucination workflow: Hallucination DETECTED")
    
    print("="*70)
    if success:
        print("✅ ALL TESTS PASSED - The validator catches the injected lie!")
        return 0
    else:
        print("❌ SOME TESTS FAILED")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)