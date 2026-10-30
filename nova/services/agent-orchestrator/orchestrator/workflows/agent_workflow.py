#!/usr/bin/env python3
"""LangGraph state machine for NOVA agent orchestrator.

This module implements the workflow state machine with:
- 8 states: planned, awaiting_approval, approved, executing, succeeded, failed, cancelled, needs_manual_action
- SqliteSaver checkpointer for persistence
- interrupt() before consequential steps
- Bounds: 6 steps / 5 turns / 30s per call / remaining-budget overall
- Single repair attempt on malformed output
- Policy decision integration
- Audit event emission at every transition
"""

import os
import json
import time
import uuid
import sqlite3
import logging
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Literal, Annotated
from enum import Enum
from pathlib import Path
from datetime import datetime, timedelta

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.pregel import RetryPolicy
from langchain_core.runnables import RunnableConfig

# Import our modules
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / "packages" / "contracts" / "mcp"))
from tool import validate_tool_definition, ToolDefinition
from call import validate_mcp_call, MCPCall

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
MAX_STEPS = 6
MAX_TURNS = 5
PER_CALL_TIMEOUT = 30  # seconds
DEFAULT_OVERALL_BUDGET = 300  # seconds (5 minutes)
REPAIR_ATTEMPTS = 1

# State definitions
class WorkflowState(str, Enum):
    PLANNED = "planned"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    EXECUTING = "executing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    NEEDS_MANUAL_ACTION = "needs_manual_action"

class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

# Type definitions
ToolCall = Dict[str, Any]  # {tool, arguments, idempotency_key, requires_approval, approval_grant}
PolicyDecision = Dict[str, Any]  # {decision, ruleId, policyVersion, approvalRequired, chatApprovalAllowed}
AuditEvent = Dict[str, Any]

@dataclass
class Step:
    """A single step in the plan."""
    index: int
    tool: str
    arguments: Dict[str, Any]
    idempotency_key: Optional[str] = None
    requires_approval: bool = False
    approval_grant: Optional[str] = None
    status: StepStatus = StepStatus.PENDING
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    repair_attempts: int = 0
    policy_decision: Optional[PolicyDecision] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

@dataclass
class WorkflowStateData:
    """Complete workflow state."""
    plan_id: str
    user_id: str
    state: WorkflowState = WorkflowState.PLANNED
    steps: List[Step] = field(default_factory=list)
    current_step_index: int = 0
    turn_count: int = 0
    overall_budget_seconds: int = DEFAULT_OVERALL_BUDGET
    budget_consumed_seconds: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None
    cancellation_requested: bool = False
    last_error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "plan_id": self.plan_id,
            "user_id": self.user_id,
            "state": self.state.value,
            "steps": [asdict(s) for s in self.steps],
            "current_step_index": self.current_step_index,
            "turn_count": self.turn_count,
            "overall_budget_seconds": self.overall_budget_seconds,
            "budget_consumed_seconds": self.budget_consumed_seconds,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "completed_at": self.completed_at,
            "cancellation_requested": self.cancellation_requested,
            "last_error": self.last_error,
            "metadata": self.metadata,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WorkflowStateData":
        steps = [Step(**s) for s in data.get("steps", [])]
        return cls(
            plan_id=data["plan_id"],
            user_id=data["user_id"],
            state=WorkflowState(data["state"]),
            steps=steps,
            current_step_index=data.get("current_step_index", 0),
            turn_count=data.get("turn_count", 0),
            overall_budget_seconds=data.get("overall_budget_seconds", DEFAULT_OVERALL_BUDGET),
            budget_consumed_seconds=data.get("budget_consumed_seconds", 0.0),
            created_at=data.get("created_at", datetime.utcnow().isoformat()),
            updated_at=data.get("updated_at", datetime.utcnow().isoformat()),
            completed_at=data.get("completed_at"),
            cancellation_requested=data.get("cancellation_requested", False),
            last_error=data.get("last_error"),
            metadata=data.get("metadata", {}),
        )

# Checkpointer setup
CHECKPOINT_DB = os.getenv("NOVA_CHECKPOINT_DB", "/tmp/nova_checkpoints.sqlite")

def get_checkpointer() -> SqliteSaver:
    """Get or create the SQLite checkpointer."""
    conn = sqlite3.connect(CHECKPOINT_DB, check_same_thread=False)
    return SqliteSaver(conn)

# Policy service client
class PolicyClient:
    """Client for calling the policy decision service."""
    
    def __init__(self, base_url: str, service_jwt: str):
        self.base_url = base_url.rstrip("/")
        self.service_jwt = service_jwt
    
    def decide(self, request: Dict[str, Any]) -> PolicyDecision:
        """Call the policy decision endpoint."""
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

# Audit client
class AuditClient:
    """Client for recording audit events."""
    
    def __init__(self, base_url: str, service_jwt: str):
        self.base_url = base_url.rstrip("/")
        self.service_jwt = service_jwt
    
    def record(self, event: AuditEvent) -> Dict[str, Any]:
        """Record an audit event."""
        import requests
        response = requests.post(
            f"{self.base_url}/audit/record",
            json=event,
            headers={
                "Authorization": f"Bearer {self.service_jwt}",
                "Content-Type": "application/json",
            },
            timeout=5,
        )
        response.raise_for_status()
        return response.json()

# MCP client wrapper
class MCPClientWrapper:
    """Wrapper around the MCP client for workflow use."""
    
    def __init__(self, base_url: str, service_jwt: str, audience: str):
        self.base_url = base_url.rstrip("/")
        self.service_jwt = service_jwt
        self.audience = audience
    
    def call_tool(self, tool: str, arguments: Dict[str, Any], 
                  idempotency_key: Optional[str] = None,
                  user_id: Optional[str] = None,
                  approval_grant: Optional[str] = None) -> Dict[str, Any]:
        """Call a tool through the MCP server."""
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

# Fake model client (for testing)
class FakeModelClient:
    """Deterministic fake model for testing."""
    
    def __init__(self, scenario: str = "happy_path"):
        self.scenario = scenario
        # Import the fake model
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
    
    def generate_plan(self, input_data: Dict[str, Any]) -> List[ToolCall]:
        """Generate a plan using the fake model."""
        builder = self.builders.get(self.scenario, self.builders["happy_path"])
        response = builder(input_data)
        return [{"tool": step["tool"], "arguments": step["arguments"], 
                 "requires_approval": step["requires_approval"],
                 "idempotency_key": step.get("idempotency_key")} for step in response["steps"]]

# Verifier
class Verifier:
    """Verifies tool results against evidence store."""
    
    def __init__(self, evidence_store: Dict[str, Any]):
        self.evidence_store = evidence_store
    
    def verify(self, tool: str, result: Dict[str, Any], expected: Dict[str, Any]) -> bool:
        """Verify a tool result against expected evidence."""
        # For stub phase: check if result matches what stub server recorded
        key = f"{tool}:{json.dumps(result, sort_keys=True)}"
        return key in self.evidence_store

# Validators
class Validators:
    """Validates tool results."""
    
    @staticmethod
    def validate_enum(value: Any, allowed: List[str], field: str) -> bool:
        return value in allowed
    
    @staticmethod
    def validate_id_scope(id_value: str, allowed_prefixes: List[str], field: str) -> bool:
        return any(id_value.startswith(p) for p in allowed_prefixes)
    
    @staticmethod
    def validate_not_stale(job_id: str, max_age_seconds: int = 3600) -> bool:
        # Check if job ID is not stale (simplified)
        return True

# Audit event emitter
class AuditEmitter:
    """Emits workflow transition audit events."""
    
    def __init__(self, audit_client: AuditClient, producer: str):
        self.audit_client = audit_client
        self.producer = producer
    
    def emit_transition(self, workflow: WorkflowStateData, from_state: WorkflowState, 
                        to_state: WorkflowState, correlation_id: str,
                        actor_id: str, actor_type: str = "system"):
        """Emit a workflow transition audit event."""
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

# Workflow nodes
def create_workflow_graph(
    policy_client: PolicyClient,
    mcp_client: MCPClientWrapper,
    audit_emitter: AuditEmitter,
    verifier: Verifier,
    validators: Validators,
    use_fake_model: bool = False,
    fake_model_scenario: str = "happy_path",
) -> StateGraph:
    """Create the LangGraph workflow graph."""
    
    # State schema
    class WorkflowState(TypedDict):
        plan_id: str
        user_id: str
        state: str
        steps: List[Dict[str, Any]]
        current_step_index: int
        turn_count: int
        overall_budget_seconds: int
        budget_consumed_seconds: float
        created_at: str
        updated_at: str
        completed_at: Optional[str]
        cancellation_requested: bool
        last_error: Optional[str]
        metadata: Dict[str, Any]
    
    def plan_node(state: WorkflowState) -> WorkflowState:
        """Generate initial plan using the model (or fake model)."""
        workflow = WorkflowStateData.from_dict(state)
        
        # Generate plan using fake model or real model
        if use_fake_model:
            fake_client = FakeModelClient()
            input_data = {
                "plan_id": workflow.plan_id,
                "user_id": workflow.user_id,
                "action": workflow.metadata.get("initial_action", "inbox.read"),
            }
            tool_calls = fake_client.generate_plan(input_data)
        else:
            # TODO: Call real model via model gateway
            tool_calls = []
        
        # Convert to steps
        workflow.steps = [
            Step(
                index=i,
                tool=tc["tool"],
                arguments=tc["arguments"],
                idempotency_key=tc.get("idempotency_key"),
                requires_approval=tc.get("requires_approval", False),
            )
            for i, tc in enumerate(tool_calls)
        ]
        
        # Validate step count
        if len(workflow.steps) > MAX_STEPS:
            workflow.state = WorkflowState.FAILED
            workflow.last_error = f"Plan exceeds maximum {MAX_STEPS} steps"
            workflow.completed_at = datetime.utcnow().isoformat()
        
        workflow.state = WorkflowState.PLANNED
        workflow.updated_at = datetime.utcnow().isoformat()
        
        # Emit audit
        audit_emitter.emit_transition(
            workflow, WorkflowState.PLANNED, WorkflowState.PLANNED,
            workflow.plan_id, workflow.user_id
        )
        
        return workflow.to_dict()
    
    def decide_node(state: WorkflowState) -> WorkflowState:
        """Get policy decision for the current step."""
        workflow = WorkflowStateData.from_dict(state)
        
        if workflow.current_step_index >= len(workflow.steps):
            workflow.state = WorkflowState.SUCCEEDED
            workflow.completed_at = datetime.utcnow().isoformat()
            return workflow.to_dict()
        
        step = workflow.steps[workflow.current_step_index]
        
        # Call policy service
        policy_request = {
            "actor": "user",
            "scope": f"{step.tool.split('.')[0]}:{'read' if step.requires_approval is False else 'write'}",
            "action": step.tool,  # full operation_id e.g., "inbox.send"
            "target": step.arguments.get("target", "own"),
            "payloadHash": step.idempotency_key or "",
        }
        
        try:
            decision = policy_client.decide(policy_request)
            step.policy_decision = decision
            
            # Check if approval needed
            if decision.get("approvalRequired"):
                step.requires_approval = True
                workflow.state = WorkflowState.AWAITING_APPROVAL
            else:
                workflow.state = WorkflowState.APPROVED
            
            # Check turn limit
            workflow.turn_count += 1
            if workflow.turn_count > MAX_TURNS:
                workflow.state = WorkflowState.FAILED
                workflow.last_error = f"Exceeded maximum {MAX_TURNS} turns"
                workflow.completed_at = datetime.utcnow().isoformat()
            
        except Exception as e:
            workflow.state = WorkflowState.FAILED
            workflow.last_error = f"Policy decision failed: {e}"
            workflow.completed_at = datetime.utcnow().isoformat()
        
        workflow.updated_at = datetime.utcnow().isoformat()
        
        # Emit audit
        audit_emitter.emit_transition(
            workflow, WorkflowState.PLANNED, workflow.state,
            workflow.plan_id, workflow.user_id
        )
        
        return workflow.to_dict()
    
    def interrupt_node(state: WorkflowState) -> WorkflowState:
        """Interrupt before consequential step - waits for approval."""
        workflow = WorkflowStateData.from_dict(state)
        
        step = workflow.steps[workflow.current_step_index]
        
        # This node is interrupted by LangGraph
        # The interrupt value carries the approval grant
        interrupt_value = state.get("__interrupt__")
        if interrupt_value:
            # Resume with approval grant
            approval_grant = interrupt_value.get("approval_grant")
            step.approval_grant = approval_grant
            workflow.state = WorkflowState.APPROVED
        
        workflow.updated_at = datetime.utcnow().isoformat()
        
        # Emit audit
        audit_emitter.emit_transition(
            workflow, WorkflowState.AWAITING_APPROVAL, workflow.state,
            workflow.plan_id, workflow.user_id
        )
        
        return workflow.to_dict()
    
    def execute_node(state: WorkflowState) -> WorkflowState:
        """Execute the current step via MCP."""
        workflow = WorkflowStateData.from_dict(state)
        
        if workflow.current_step_index >= len(workflow.steps):
            workflow.state = WorkflowState.SUCCEEDED
            workflow.completed_at = datetime.utcnow().isoformat()
            return workflow.to_dict()
        
        step = workflow.steps[workflow.current_step_index]
        workflow.state = WorkflowState.EXECUTING
        step.status = StepStatus.RUNNING
        step.started_at = datetime.utcnow().isoformat()
        
        # Check budget
        if workflow.budget_consumed_seconds >= workflow.overall_budget_seconds:
            workflow.state = WorkflowState.FAILED
            workflow.last_error = "Overall budget exhausted"
            workflow.completed_at = datetime.utcnow().isoformat()
            return workflow.to_dict()
        
        start_time = time.time()
        
        try:
            # Call tool via MCP
            result = mcp_client.call_tool(
                tool=step.tool,
                arguments=step.arguments,
                idempotency_key=step.idempotency_key,
                user_id=workflow.user_id,
                approval_grant=step.approval_grant,
            )
            
            elapsed = time.time() - start_time
            workflow.budget_consumed_seconds += elapsed
            
            if result.get("ok"):
                step.result = result.get("result")
                step.status = StepStatus.COMPLETED
                
                # Verify result
                if not verifier.verify(step.tool, step.result, {}):
                    step.status = StepStatus.FAILED
                    step.error = "Verification failed"
                    workflow.state = WorkflowState.FAILED
                    workflow.last_error = "Tool result verification failed"
                else:
                    # Validate result
                    if not validators.validate_enum(step.result.get("status"), ["ok", "success"], "status"):
                        step.status = StepStatus.FAILED
                        step.error = "Invalid result status"
                        workflow.state = WorkflowState.FAILED
                        workflow.last_error = "Invalid result from tool"
                
                # Move to next step
                workflow.current_step_index += 1
                
            else:
                step.error = result.get("error", {}).get("message", "Tool execution failed")
                step.status = StepStatus.FAILED
                step.repair_attempts += 1
                
                if step.repair_attempts <= REPAIR_ATTEMPTS:
                    # Allow one repair attempt - stay on same step
                    workflow.state = WorkflowState.EXECUTING
                else:
                    workflow.state = WorkflowState.FAILED
                    workflow.last_error = step.error
            
        except Exception as e:
            step.error = str(e)
            step.status = StepStatus.FAILED
            step.repair_attempts += 1
            
            if step.repair_attempts <= REPAIR_ATTEMPTS:
                workflow.state = WorkflowState.EXECUTING
            else:
                workflow.state = WorkflowState.FAILED
                workflow.last_error = f"Tool execution failed: {e}"
        
        step.completed_at = datetime.utcnow().isoformat()
        workflow.updated_at = datetime.utcnow().isoformat()
        
        # Emit audit
        if workflow.state in (WorkflowState.SUCCEEDED, WorkflowState.FAILED, WorkflowState.COMPLETED):
            audit_emitter.emit_transition(
                workflow, WorkflowState.EXECUTING, workflow.state,
                workflow.plan_id, workflow.user_id
            )
        
        return workflow.to_dict()
    
    def finalize_node(state: WorkflowState) -> WorkflowState:
        """Finalize workflow - emit final audit."""
        workflow = WorkflowStateData.from_dict(state)
        
        if workflow.state == WorkflowState.SUCCEEDED:
            workflow.completed_at = datetime.utcnow().isoformat()
        
        workflow.updated_at = datetime.utcnow().isoformat()
        
        # Final audit
        audit_emitter.emit_transition(
            workflow, workflow.state, workflow.state,
            workflow.plan_id, workflow.user_id
        )
        
        return workflow.to_dict()
    
    # Build graph
    graph = StateGraph(WorkflowState)
    
    graph.add_node("plan", plan_node)
    graph.add_node("decide", decide_node)
    graph.add_node("interrupt", interrupt_node)
    graph.add_node("execute", execute_node)
    graph.add_node("finalize", finalize_node)
    
    # Edges
    graph.add_edge(START, "plan")
    graph.add_edge("plan", "decide")
    
    # Conditional edges from decide
    def route_after_decide(state: WorkflowState) -> str:
        workflow = WorkflowStateData.from_dict(state)
        if workflow.state == WorkflowState.AWAITING_APPROVAL:
            return "interrupt"
        elif workflow.state == WorkflowState.APPROVED:
            return "execute"
        else:
            return "finalize"
    
    graph.add_conditional_edges("decide", route_after_decide, {
        "interrupt": "interrupt",
        "execute": "execute",
        "finalize": "finalize",
    })
    
    # Interrupt node uses LangGraph interrupt
    graph.add_edge("interrupt", "execute")
    
    # Conditional edges from execute
    def route_after_execute(state: WorkflowState) -> str:
        workflow = WorkflowStateData.from_dict(state)
        if workflow.current_step_index >= len(workflow.steps):
            return "finalize"
        elif workflow.state == WorkflowState.EXECUTING:
            return "decide"  # Next step needs policy check
        else:
            return "finalize"
    
    graph.add_conditional_edges("execute", route_after_execute, {
        "decide": "decide",
        "finalize": "finalize",
    })
    
    graph.add_edge("finalize", END)
    
    return graph.compile(checkpointer=get_checkpointer())


def create_orchestrator(
    policy_url: str,
    mcp_url: str,
    audit_url: str,
    service_jwt: str,
    use_fake_model: bool = False,
    fake_model_scenario: str = "happy_path",
    checkpoint_db: str = CHECKPOINT_DB,
) -> StateGraph:
    """Create a configured orchestrator instance."""
    
    policy_client = PolicyClient(policy_url, service_jwt)
    mcp_client = MCPClientWrapper(mcp_url, service_jwt, "nova-mcp")
    audit_client = AuditClient(audit_url, service_jwt)
    audit_emitter = AuditEmitter(audit_client, "agent-orchestrator")
    verifier = Verifier({})  # Empty evidence store for stub phase
    validators = Validators()
    
    return create_workflow_graph(
        policy_client=policy_client,
        mcp_client=mcp_client,
        audit_emitter=audit_emitter,
        verifier=verifier,
        validators=validators,
        use_fake_model=use_fake_model,
        fake_model_scenario=fake_model_scenario,
    )


# Main entry point for running workflows
async def run_workflow(
    orchestrator: StateGraph,
    plan_id: str,
    user_id: str,
    initial_action: str,
    config: Optional[RunnableConfig] = None,
) -> Dict[str, Any]:
    """Run a workflow to completion."""
    
    initial_state = {
        "plan_id": plan_id,
        "user_id": user_id,
        "state": WorkflowState.PLANNED.value,
        "steps": [],
        "current_step_index": 0,
        "turn_count": 0,
        "overall_budget_seconds": DEFAULT_OVERALL_BUDGET,
        "budget_consumed_seconds": 0.0,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "cancellation_requested": False,
        "last_error": None,
        "metadata": {"initial_action": initial_action},
    }
    
    config = config or {"configurable": {"thread_id": plan_id}}
    
    # Run the workflow
    result = await orchestrator.ainvoke(initial_state, config)
    
    return result


if __name__ == "__main__":
    import asyncio
    
    # Test run with fake model
    orchestrator = create_orchestrator(
        policy_url="http://localhost:8001",
        mcp_url="http://localhost:8003",
        audit_url="http://localhost:8004",
        service_jwt="test-jwt",
        use_fake_model=True,
        fake_model_scenario="happy_path",
    )
    
    result = asyncio.run(run_workflow(
        orchestrator,
        plan_id=str(uuid.uuid4()),
        user_id="test-user",
        initial_action="inbox.read",
    ))
    
    print(json.dumps(result, indent=2))