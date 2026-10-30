#!/usr/bin/env python3
"""NOVA Agent Orchestrator - Main entry point."""

import os
import asyncio
import uuid
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from pathlib import Path

from .graph import create_workflow_graph_with_checkpointer
from .state import WorkflowStateData, WorkflowState

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_workflow(
    plan_id: str,
    user_id: str,
    initial_action: str,
    use_fake_model: bool = True,
    scenario: str = "happy_path",
    config: Optional[dict] = None,
) -> Dict[str, Any]:
    """Run a workflow to completion."""
    
    orchestrator = await create_workflow_graph_with_checkpointer(use_fake_model=use_fake_model)
    
    initial_state = {
        "plan_id": plan_id,
        "user_id": user_id,
        "state": "planned",
        "steps": [],
        "current_step_index": 0,
        "turn_count": 0,
        "overall_budget_seconds": 300,
        "budget_consumed_seconds": 0.0,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "cancellation_requested": False,
        "last_error": None,
        "metadata": {"initial_action": initial_action, "scenario": scenario},
    }
    
    config = config or {"configurable": {"thread_id": plan_id}}
    
    # Run the workflow
    result = await orchestrator.ainvoke(initial_state, config)
    
    return result


async def main():
    """Test run with fake model."""
    plan_id = str(uuid.uuid4())
    user_id = "test-user"
    initial_action = "inbox.read"
    
    result = await run_workflow(
        plan_id=plan_id,
        user_id=user_id,
        initial_action=initial_action,
        use_fake_model=True,
    )
    
    print(json.dumps(result, indent=2))
    
    return result


if __name__ == "__main__":
    import uuid
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / "tests" / "fixtures" / "fake-model"))
    
    asyncio.run(main())