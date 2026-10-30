#!/usr/bin/env python3
"""Workflow state definitions for NOVA agent orchestrator."""

import os
import json
import uuid
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any
from enum import Enum
from datetime import datetime
from pathlib import Path


# Constants
MAX_STEPS = 6
MAX_TURNS = 5
PER_CALL_TIMEOUT = 30  # seconds
DEFAULT_OVERALL_BUDGET = 300  # seconds (5 minutes)
REPAIR_ATTEMPTS = 1


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


@dataclass
class UntrustedPayload:
    """Wrapper for external payloads that must be treated as untrusted (Module 04 Layer 6).
    
    Every external payload (MCP tool results, email bodies, document content, etc.)
    is wrapped to enforce that it cannot change policy (spec:216).
    """
    data: Any
    source_tool: str
    trusted: bool = False
    received_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "data": self.data,
            "source_tool": self.source_tool,
            "trusted": self.trusted,
            "received_at": self.received_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UntrustedPayload":
        return cls(
            data=data["data"],
            source_tool=data["source_tool"],
            trusted=data.get("trusted", False),
            received_at=data.get("received_at", datetime.utcnow().isoformat()),
        )


@dataclass
class Step:
    """A single step in the plan."""
    index: int
    tool: str
    arguments: Dict[str, Any]
    status: "StepStatus" = StepStatus.PENDING
    result: Optional["UntrustedPayload"] = None
    idempotency_key: Optional[str] = None
    requires_approval: bool = False
    approval_grant: Optional[str] = None
    error: Optional[str] = None
    repair_attempts: int = 0
    policy_decision: Optional[Dict[str, Any]] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


@dataclass
class WorkflowStateData:
    """Complete workflow state."""
    plan_id: str
    user_id: str
    steps: List[Step] = field(default_factory=list)
    current_step_index: int = 0
    turn_count: int = 0
    overall_budget_seconds: int = 300
    budget_consumed_seconds: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None
    cancellation_requested: bool = False
    last_error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    state: "WorkflowState" = "planned"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "plan_id": self.plan_id,
            "user_id": self.user_id,
            "state": self.state.value if isinstance(self.state, WorkflowState) else self.state,
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
        steps = []
        for s in data.get("steps", []):
            result = s.get("result")
            if result is not None and isinstance(result, dict):
                # Reconstruct UntrustedPayload if it was serialized
                if "data" in result and "source_tool" in result:
                    s["result"] = UntrustedPayload.from_dict(result)
                else:
                    # Legacy format: plain dict, wrap it
                    s["result"] = UntrustedPayload(
                        data=result,
                        source_tool="unknown",
                        trusted=False,
                    )
            steps.append(Step(**s))
        state_val = data.get("state", "planned")
        last_error = data.get("last_error")
        if isinstance(state_val, str):
            try:
                state_val = WorkflowState(state_val)
            except ValueError:
                # Fail closed: an unknown state string is not planned work.
                # It must never resurrect as planned and re-enter execution.
                state_val = WorkflowState.FAILED
                last_error = last_error or f"unknown workflow state rehydrated: {data.get('state')}"
        return cls(
            plan_id=data["plan_id"],
            user_id=data["user_id"],
            state=state_val,
            steps=steps,
            current_step_index=data.get("current_step_index", 0),
            turn_count=data.get("turn_count", 0),
            overall_budget_seconds=data.get("overall_budget_seconds", 300),
            budget_consumed_seconds=data.get("budget_consumed_seconds", 0.0),
            created_at=data.get("created_at", datetime.utcnow().isoformat()),
            updated_at=data.get("updated_at", datetime.utcnow().isoformat()),
            completed_at=data.get("completed_at"),
            cancellation_requested=data.get("cancellation_requested", False),
            last_error=last_error,
            metadata=data.get("metadata", {}),
        )