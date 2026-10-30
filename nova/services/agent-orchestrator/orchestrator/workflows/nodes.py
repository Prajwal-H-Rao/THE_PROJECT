#!/usr/bin/env python3
"""Workflow nodes for NOVA agent orchestrator."""

import os
import sys
import json
import time
import uuid
import logging
from typing import Dict, List, Optional, Any, TypedDict
from datetime import datetime
from pathlib import Path

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver

from .state import (
    WorkflowStateData, Step, StepStatus, WorkflowState,
    MAX_STEPS, MAX_TURNS, PER_CALL_TIMEOUT, DEFAULT_OVERALL_BUDGET, REPAIR_ATTEMPTS,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
CHECKPOINT_DB = os.getenv("NOVA_CHECKPOINT_DB", "/tmp/nova_checkpoints.sqlite")

# Type definitions
class PolicyDecision(TypedDict):
    decision: str
    ruleId: str
    policyVersion: int
    approvalRequired: Optional[Dict[str, Any]]
    chatApprovalAllowed: Optional[bool]
    chatApprovalReason: Optional[str]

# Mock clients for now (will be replaced with real clients)
class PolicyClient:
    def __init__(self, base_url: str, service_jwt: str):
        self.base_url = base_url.rstrip("/")
        self.service_jwt = service_jwt
    
    def decide(self, request: Dict[str, Any]) -> Dict[str, Any]:
        import requests
        response = requests.post(
            f"{self.base_url}/policy/decide",
            json=request,
            headers={
                "Authorization": f"Bearer {self.service_jwt}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()


class MCPClientWrapper:
    def __init__(self, base_url: str, service_jwt: str, audience: str):
        self.base_url = base_url.rstrip("/")
        self.service_jwt = service_jwt
        self.audience = audience
    
    def call_tool(self, tool: str, arguments: Dict[str, Any], 
                  idempotency_key: Optional[str] = None,
                  user_id: Optional[str] = None,
                  approval_grant: Optional[str] = None) -> Dict[str, Any]:
        import requests
        call_id = str(uuid.uuid4())
        payload = {
            "call_id": call_id,
            "tool": tool,
            "arguments": arguments,
            "idempotency_key": idempotency_key,
            "service_jwt": os.getenv("NOVA_SERVICE_JWT"),
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "approval_grant": approval_grant,
        }
        response = requests.post(
            f"{self.base_url}/v1/call",
            json=payload,
            headers={
                "Authorization": f"Bearer {self.service_jwt}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()


class FakeModelClient:
    def __init__(self, scenario: str = "happy_path"):
        self.scenario = scenario
        sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / "tests" / "fixtures" / "fake-model"))
        from fake_model import build_happy_path_response, build_wrong_tool_response, build_invalid_args_response, build_out_of_scope_response, build_injection_response, build_multi_turn_response
        self.builders = {
            "happy_path": build_happy_path_response,
            "wrong_tool": build_wrong_tool_response,
            "invalid_args": build_invalid_args_response,
            "out_of_scope": build_out_of_scope_response,
            "injection": build_injection_response,
            "multi_turn": build_multi_turn_response,
        }
    
    def generate_plan(self, input_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        builder = self.builders.get(self.scenario, self.builders["happy_path"])
        response = builder(input_data)
        return [{"tool": step["tool"], "arguments": step["arguments"], 
                 "requires_approval": step["requires_approval"],
                 "idempotency_key": step.get("idempotency_key")} for step in response["steps"]]


class Verifier:
    def __init__(self, evidence_store: Dict[str, Any]):
        self.evidence_store = evidence_store
    
    def verify(self, tool: str, result: Dict[str, Any], expected: Dict[str, Any]) -> bool:
        key = f"{tool}:{json.dumps(result, sort_keys=True)}"
        return key in self.evidence_store


class Validators:
    @staticmethod
    def validate_enum(value: Any, allowed: List[str], field: str) -> bool:
        return value in allowed
    
    @staticmethod
    def validate_id_scope(id_value: str, allowed_prefixes: List[str], field: str) -> bool:
        return any(id_value.startswith(p) for p in allowed_prefixes)
    
    @staticmethod
    def validate_not_stale(job_id: str, max_age_seconds: int = 3600) -> bool:
        return True


class AuditEmitter:
    def __init__(self, audit_client: Any, producer: str):
        self.audit_client = audit_client
        self.producer = producer
    
    def emit_transition(self, workflow: WorkflowStateData, from_state: WorkflowState, 
                        to_state: WorkflowState, correlation_id: str,
                        actor_id: str, actor_type: str = "system"):
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "workflow.transition",
            "schema_version": 1,
            "occurred_at": datetime.utcnow().isoformat(),
            "producer": self.producer,
            "correlation_id": correlation_id,
            "actor_type": actor_type,
            "actor_id": actor_id,
            "action": f"workflow.{to_state.value}",
            "resource_type": "workflow",
            "resource_id": workflow.plan_id,
            "policy_result": "not_evaluated",
            "policy_version": 1,
            "execution_status": to_state.value,
            "verification_type": "none",
            "payload": {
                "plan_id": workflow.plan_id,
                "from_state": from_state.value,
                "to_state": to_state.value,
                "step_index": workflow.current_step_index,
                "turn_count": workflow.turn_count,
            },
            "dedupe_key": f"{workflow.plan_id}:{to_state.value}",
        }
        try:
            self.audit_client.record(event)
        except Exception as e:
            logger.error(f"Failed to emit audit event: {e}")


def plan_node(state: Dict[str, Any], use_fake_model: bool = False) -> Dict[str, Any]:
    """Generate initial plan using the model (or fake model)."""
    from .state import WorkflowStateData, Step, StepStatus, WorkflowState
    from .plan_validation import validate_plan

    workflow = WorkflowStateData.from_dict(state)

    metadata = state.get("metadata", {})
    scenario = metadata.get("scenario", "happy_path")

    # Generate plan using fake model or real model
    if use_fake_model:
        sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / "tests" / "fixtures" / "fake-model"))
        from fake_model import build_happy_path_response, build_wrong_tool_response, build_invalid_args_response, build_out_of_scope_response, build_injection_response, build_multi_turn_response
        builders = {
            "happy_path": build_happy_path_response,
            "wrong_tool": build_wrong_tool_response,
            "invalid_args": build_invalid_args_response,
            "out_of_scope": build_out_of_scope_response,
            "injection": build_injection_response,
            "multi_turn": build_multi_turn_response,
        }
        builder = builders.get(scenario, builders["happy_path"])
        input_data = {
            "plan_id": state.get("plan_id", str(uuid.uuid4())),
            "user_id": state.get("user_id", "test-user"),
            "action": metadata.get("initial_action", "inbox.read"),
        }
        response = builder(input_data)
        # ModelResponse is a dataclass with ToolCall steps
        if hasattr(response, '__dict__'):
            response_dict = response.__dict__
        else:
            response_dict = response
        tool_calls = []
        for step in response_dict["steps"]:
            if hasattr(step, '__dict__'):
                step_dict = step.__dict__
            else:
                step_dict = step
            tool_calls.append({
                "tool": step_dict["tool"],
                "arguments": step_dict["arguments"],
                "requires_approval": step_dict["requires_approval"],
                "idempotency_key": step_dict.get("idempotency_key"),
            })
    else:
        # TODO: Call real model via model gateway
        tool_calls = []
    
    # Convert to steps
    steps = [
        Step(
            index=i,
            tool=tc["tool"],
            arguments=tc["arguments"],
            idempotency_key=tc.get("idempotency_key"),
            requires_approval=tc.get("requires_approval", False),
        )
        for i, tc in enumerate(tool_calls)
    ]

    # Layer 3: constrain the proposal to enumerated tool IDs. spec:202.
    # Family join is the operation-id prefix; the routed family comes from
    # metadata (set at ingress) or the initial_action prefix as fallback.
    routed_family = metadata.get("routed_family") or \
        metadata.get("initial_action", "inbox.read").split(".")[0]
    denial = validate_plan(tool_calls, routed_family)
    if denial is not None:
        workflow = WorkflowStateData(
            plan_id=state.get("plan_id", str(uuid.uuid4())),
            user_id=state.get("user_id", "test-user"),
            state="failed",
            current_step_index=0,
            turn_count=0,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
            last_error=f"{denial['code']}: {denial['detail']}",
        )
        return workflow.to_dict()

    # Create workflow object
    workflow = WorkflowStateData(
        plan_id=state.get("plan_id", str(uuid.uuid4())),
        user_id=state.get("user_id", "test-user"),
        state="planned",
        steps=steps,
        current_step_index=0,
        turn_count=0,
        overall_budget_seconds=300,
        budget_consumed_seconds=0.0,
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    
    # Validate step count
    if len(workflow.steps) > 6:
        workflow.state = "failed"
        workflow.last_error = "Plan exceeds maximum 6 steps"
        workflow.completed_at = datetime.utcnow().isoformat()
    
    workflow.updated_at = datetime.utcnow().isoformat()
    
    return workflow.to_dict()


def decide_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Get policy decision for the current step."""
    from .state import WorkflowStateData, WorkflowState

    workflow = WorkflowStateData.from_dict(state)

    if workflow.current_step_index >= len(workflow.steps):
        workflow.state = WorkflowState.SUCCEEDED
        workflow.completed_at = datetime.utcnow().isoformat()
        return workflow.to_dict()
    
    step = workflow.steps[workflow.current_step_index]

    # Fail closed: a terminal state (a denied plan, a completed run) must
    # never be reset to approved by the policy simulation below.
    if workflow.state in (WorkflowState.FAILED, WorkflowState.SUCCEEDED,
                          WorkflowState.CANCELLED):
        return workflow.to_dict()

    # TODO: Call real policy service

    # For now, simulate policy decision
    # In real implementation, call policy service
    requires_approval = step.requires_approval
    
    # Simulate policy decision
    decision = {
        "decision": "needs_approval" if step.requires_approval else "allow",
        "ruleId": f"{step.tool.split('.')[0]}.{step.tool.split('.')[-1]}",
        "policyVersion": 1,
        "approvalRequired": {
            "payloadHash": step.idempotency_key or "",
            "expirySeconds": 3600,
            "nonce": str(uuid.uuid4())[:16],
            "requiresStepUp": True,
        } if step.requires_approval else None,
    }
    
    step.policy_decision = decision
    
    if step.requires_approval:
        # In real implementation, this would come from policy service
        pass
    
    if step.requires_approval:
        workflow.state = "awaiting_approval"
    else:
        workflow.state = "approved"
    
    # Check turn limit
    workflow.turn_count += 1
    if workflow.turn_count > 5:
        workflow.state = "failed"
        workflow.last_error = "Exceeded maximum 5 turns"
        workflow.completed_at = datetime.utcnow().isoformat()
    
    workflow.updated_at = datetime.utcnow().isoformat()
    
    return workflow.to_dict()


def interrupt_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Interrupt before consequential step - waits for approval."""
    workflow = WorkflowStateData.from_dict(state)
    
    step = workflow.steps[workflow.current_step_index]
    
    # This node is interrupted by LangGraph
    # The interrupt value carries the approval grant
    interrupt_value = state.get("__interrupt__")
    if interrupt_value:
        # Resume with approval grant
        approval_grant = interrupt_value.get("approval_grant")
        if approval_grant:
            workflow.steps[workflow.current_step_index].approval_grant = approval_grant
            workflow.state = "approved"
    
    workflow.updated_at = datetime.utcnow().isoformat()
    
    return workflow.to_dict()


def execute_node(state: Dict[str, Any], mcp_client: Any = None, verifier: Any = None, validators: Any = None) -> Dict[str, Any]:
    """Execute the current step via MCP."""
    from .state import WorkflowStateData, StepStatus, WorkflowState
    
    workflow = WorkflowStateData.from_dict(state)
    
    if workflow.current_step_index >= len(workflow.steps):
        workflow.state = "succeeded"
        workflow.completed_at = datetime.utcnow().isoformat()
        return workflow.to_dict()
    
    step = workflow.steps[workflow.current_step_index]
    workflow.state = "executing"
    step.status = "running"
    step.started_at = datetime.utcnow().isoformat()
    
    # Check budget
    if workflow.budget_consumed_seconds >= workflow.overall_budget_seconds:
        workflow.state = "failed"
        workflow.last_error = "Overall budget exhausted"
        workflow.completed_at = datetime.utcnow().isoformat()
        return workflow.to_dict()
    
    start_time = time.time()
    
    try:
        # Call tool via MCP (mock for now)
        # In real implementation, call mcp_client.call_tool
        result = {"ok": True, "result": {"status": "ok"}}
        
        elapsed = time.time() - start_time
        workflow.budget_consumed_seconds += elapsed
        
        if result.get("ok"):
            step.result = result.get("result")
            step.status = "completed"
            
            # Move to next step
            workflow.current_step_index += 1
            
            # Check if all steps are done
            if workflow.current_step_index >= len(workflow.steps):
                workflow.state = "succeeded"
                workflow.completed_at = datetime.utcnow().isoformat()
            
        else:
            step.error = result.get("error", {}).get("message", "Tool execution failed")
            step.status = "failed"
            step.repair_attempts += 1
            
            if step.repair_attempts <= 1:
                workflow.state = "executing"
            else:
                workflow.state = "failed"
                workflow.last_error = step.error
        
    except Exception as e:
        step.error = str(e)
        step.status = "failed"
        step.repair_attempts += 1
        
        if step.repair_attempts <= 1:
            workflow.state = "executing"
        else:
            workflow.state = "failed"
            workflow.last_error = f"Tool execution failed: {e}"
    
    step.completed_at = datetime.utcnow().isoformat()
    workflow.updated_at = datetime.utcnow().isoformat()
    
    return workflow.to_dict()


def finalize_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Finalize workflow - emit final audit."""
    workflow = WorkflowStateData.from_dict(state)
    
    if workflow.state == "succeeded":
        workflow.completed_at = datetime.utcnow().isoformat()
    
    workflow.updated_at = datetime.utcnow().isoformat()
    
    return workflow.to_dict()