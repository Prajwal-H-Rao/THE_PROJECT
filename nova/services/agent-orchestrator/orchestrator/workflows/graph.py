#!/usr/bin/env python3
"""LangGraph graph construction for NOVA agent orchestrator."""

from typing import Dict, Any, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
import os

from .state import WorkflowStateData, WorkflowState, Step, StepStatus
from .nodes import plan_node, decide_node, interrupt_node, execute_node, finalize_node


# Type definitions
class WorkflowStateDict(TypedDict):
    plan_id: str
    user_id: str
    state: str
    steps: list
    current_step_index: int
    turn_count: int
    overall_budget_seconds: int
    budget_consumed_seconds: float
    created_at: str
    updated_at: str
    completed_at: str
    cancellation_requested: bool
    last_error: str
    metadata: dict


# Constants
MAX_STEPS = 6
MAX_TURNS = 5
DEFAULT_OVERALL_BUDGET = 300
CHECKPOINT_DB = os.getenv("NOVA_CHECKPOINT_DB", "/tmp/nova_checkpoints.sqlite")


async def get_async_checkpointer():
    """Get or create the async SQLite checkpointer."""
    return await AsyncSqliteSaver.from_conn_string(CHECKPOINT_DB)


def route_after_plan(state: Dict[str, Any]) -> str:
    """Route after the plan node. Unknown values fail closed to finalize."""
    workflow_state = state.get("state", "planned")
    if workflow_state == "planned":
        return "decide"
    # "failed" (a denied plan) and any unexpected value stop before execution.
    return "finalize"


def route_after_decide(state: Dict[str, Any]) -> str:
    """Route after decide node."""
    workflow_state = state.get("state", "planned")
    if workflow_state == "awaiting_approval":
        return "interrupt"
    elif workflow_state == "approved":
        return "execute"
    else:
        return "finalize"


def route_after_execute(state: Dict[str, Any]) -> str:
    """Route after execute node."""
    workflow = state
    if workflow.get("current_step_index", 0) >= len(workflow.get("steps", [])):
        return "finalize"
    elif workflow.get("state") == "executing":
        return "decide"
    else:
        return "finalize"


def create_workflow_graph(use_fake_model: bool = False) -> Any:
    """Create the LangGraph workflow graph."""
    from langgraph.graph import StateGraph, START, END
    
    class WorkflowStateDict(TypedDict):
        plan_id: str
        user_id: str
        state: str
        steps: list
        current_step_index: int
        turn_count: int
        overall_budget_seconds: int
        budget_consumed_seconds: float
        created_at: str
        updated_at: str
        completed_at: str
        cancellation_requested: bool
        last_error: str
        metadata: dict
    
    graph = StateGraph(dict)
    
    # Add nodes
    graph.add_node("plan", lambda s: plan_node(s, use_fake_model=True))
    graph.add_node("decide", lambda s: decide_node(s))
    graph.add_node("interrupt", lambda s: interrupt_node(s))
    graph.add_node("execute", lambda s: execute_node(s))
    graph.add_node("finalize", lambda s: finalize_node(s))
    
    graph.add_edge(START, "plan")

    # Plan node emits only planned or failed: never execute a denied plan.
    graph.add_conditional_edges("plan", route_after_plan, {
        "decide": "decide",
        "finalize": "finalize",
    })

    # Conditional edges from decide
    graph.add_conditional_edges("decide", lambda s: s.get("state", "planned"), {
        "awaiting_approval": "interrupt",
        "approved": "execute",
        "failed": "finalize",
        "cancelled": "finalize",
        "succeeded": "finalize",
        "planned": "execute",  # fallback
    })
    
    # Interrupt node uses LangGraph interrupt
    graph.add_edge("interrupt", "execute")
    
    # Conditional edges from execute
    graph.add_conditional_edges("execute", lambda s: "finalize" if s.get("current_step_index", 0) >= len(s.get("steps", [])) else "decide", {
        "decide": "decide",
        "finalize": "finalize",
    })
    
    graph.add_edge("finalize", END)
    
    return graph


async def create_workflow_graph_with_checkpointer(use_fake_model: bool = False) -> Any:
    """Create the LangGraph workflow graph with async checkpointer."""
    graph = create_workflow_graph(use_fake_model)
    checkpointer = await _get_checkpointer()
    return graph.compile(checkpointer=checkpointer)


# Module-level checkpointer (created once, kept alive)
_checkpointer_instance = None
_checkpointer_cm = None

async def _get_checkpointer():
    """Get or create the async checkpointer (singleton)."""
    global _checkpointer_instance
    if _checkpointer_instance is None:
        # Create checkpointer using async context manager __aenter__
        global _checkpointer_cm
        _checkpointer_cm = AsyncSqliteSaver.from_conn_string(
            os.getenv("NOVA_CHECKPOINT_DB", "/tmp/nova_checkpoints.sqlite")
        )
        _checkpointer_instance = await _checkpointer_cm.__aenter__()
    return _checkpointer_instance