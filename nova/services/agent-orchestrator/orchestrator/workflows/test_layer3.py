#!/usr/bin/env python3
"""Tests for Module 04 layer 3: constrained planning over enumerated tool IDs."""

import sys
from pathlib import Path

WORKFLOWS = Path(__file__).parent
# Import as the orchestrator.workflows package so relative imports resolve.
sys.path.insert(0, str(WORKFLOWS.parents[3] / "tests" / "fixtures" / "fake-model"))
sys.path.insert(0, str(WORKFLOWS.parent.parent))  # nova/services/agent-orchestrator

from orchestrator.workflows.tool_catalogue import load_tool_catalogue, CatalogueError, load_catalogue_families
from orchestrator.workflows.plan_validation import validate_plan, validate_step
from orchestrator.workflows.state import WorkflowStateData
from orchestrator.workflows.graph import route_after_plan
from orchestrator.workflows import nodes


def test_happy_path_passes():
    """A valid in-catalogue plan with a matching family passes."""
    catalogue = load_tool_catalogue()
    step = {"tool": "inbox.read", "arguments": {"query": "unread", "limit": 10}}
    denial = validate_step(step, catalogue, "inbox")
    assert denial is None
    print("✓ happy path plan passes")


def test_unenumerated_tool_denied():
    """A tool outside the catalogue is a typed tool_not_found denial."""
    catalogue = load_tool_catalogue()
    step = {"tool": "admin.delete_user", "arguments": {"user_id": "victim"}}
    denial = validate_step(step, catalogue, "inbox")
    assert denial is not None and denial["code"] == "tool_not_found"
    print("✓ un-enumerated tool denied")


def test_family_mismatch_denied():
    """An enumerated tool from another family is denied for this plan."""
    catalogue = load_tool_catalogue()
    step = {"tool": "calendar_tasks.read",
            "arguments": {"start": "2026-01-01T00:00:00Z", "end": "2026-01-02T00:00:00Z"}}
    denial = validate_step(step, catalogue, "inbox")
    assert denial is not None and denial["code"] == "tool_not_found"
    print("✓ family mismatch denied")


def test_non_object_arguments_denied():
    """The invalid_args fixture shape (string arguments) is a typed denial."""
    catalogue = load_tool_catalogue()
    step = {"tool": "inbox.read", "arguments": "not an object"}
    denial = validate_step(step, catalogue, "inbox")
    assert denial is not None and denial["code"] == "schema_mismatch"
    print("✓ non-object arguments denied")


def test_extra_field_denied():
    """An undeclared argument field fails additionalProperties: false."""
    catalogue = load_tool_catalogue()
    step = {"tool": "trips.read", "arguments": {"origin": "NYC", "destination": "LAX", "url": "https://evil.example"}}
    denial = validate_step(step, catalogue, "trips")
    assert denial is not None and denial["code"] == "invalid_arguments"
    print("✓ extra field denied")


def test_url_in_command_target_denied():
    """A URL-shaped value in a command-target field is denied."""
    catalogue = load_tool_catalogue()
    step = {"tool": "trips.read", "arguments": {"origin": "https://evil.example", "destination": "LAX"}}
    denial = validate_step(step, catalogue, "trips")
    assert denial is not None and denial["code"] == "invalid_arguments"
    print("✓ URL in command target denied")


def test_sql_in_query_denied():
    """A SQL statement in a query field is denied."""
    catalogue = load_tool_catalogue()
    step = {"tool": "notes_memory.search", "arguments": {"query": "SELECT secret FROM users", "limit": 5}}
    denial = validate_step(step, catalogue, "notes_memory")
    assert denial is not None and denial["code"] == "invalid_arguments"
    print("✓ SQL in query denied")


def test_shell_chain_denied():
    """The injection fixture shape (chained command in query) is denied."""
    catalogue = load_tool_catalogue()
    step = {"tool": "inbox.read", "arguments": {"query": "unread; rm -rf /", "limit": 10}}
    denial = validate_step(step, catalogue, "inbox")
    assert denial is not None and denial["code"] == "invalid_arguments"
    print("✓ shell chain denied")


def test_prose_content_not_scanned():
    """Prose fields hold layer-6 content: URLs and quoted SQL stay allowed."""
    catalogue = load_tool_catalogue()
    step = {"tool": "inbox.draft", "arguments": {
        "to": "user@example.com",
        "subject": "Weekly report",
        "body": "See the dashboard https://data.example/report and draft 'SELECT * FROM t' notes.",
    }}
    denial = validate_step(step, catalogue, "inbox")
    assert denial is None
    print("✓ prose content not scanned")


def test_catalogue_missing_file_fails_closed():
    """A broken or missing catalogue is a typed denial at plan time."""
    bad_dir = str(Path(__file__).parent / "no-such-catalogue-dir")
    try:
        load_tool_catalogue(bad_dir)
        assert False, "expected CatalogueError"
    except CatalogueError as exc:
        assert exc.code == "tool_not_found"
    denial = validate_plan([{"tool": "inbox.read", "arguments": {}}], "inbox", catalogue_dir=bad_dir)
    assert denial is not None and denial["code"] == "tool_not_found"
    print("✓ missing catalogue fails closed")


def test_fake_model_matches_catalogue():
    """The fake model mirror must not name operations the catalogue denies."""
    import fake_model
    catalogue = load_tool_catalogue()
    fake_ops = set(fake_model.TOOL_CATALOGUE.keys())
    assert fake_ops == set(catalogue.keys()), f"drift: {fake_ops ^ set(catalogue.keys())}"
    print("✓ fake model matches catalogue")


def test_from_dict_unknown_state_fails_closed():
    """An unknown state string rehydrates as failed, never as planned."""
    data = {"plan_id": "p", "user_id": "u", "state": "needs_clarification"}
    workflow = WorkflowStateData.from_dict(data)
    assert workflow.state.value == "failed"
    assert workflow.last_error is not None
    print("✓ unknown state rehydrates as failed")


def test_route_after_plan_fail_closed():
    """Planned routes to decide; failed and unknown values route to finalize."""
    assert route_after_plan({"state": "planned"}) == "decide"
    assert route_after_plan({"state": "failed"}) == "finalize"
    assert route_after_plan({"state": "garbage"}) == "finalize"
    print("✓ plan routing fails closed")


def test_plan_node_scenario_plumbing():
    """The invalid_args scenario reaches plan_node and produces a failed plan."""
    state = {
        "plan_id": "p1", "user_id": "u1", "state": "planned",
        "steps": [], "current_step_index": 0, "turn_count": 0,
        "overall_budget_seconds": 300, "budget_consumed_seconds": 0.0,
        "created_at": "2026-01-01T00:00:00", "updated_at": "2026-01-01T00:00:00",
        "completed_at": None, "cancellation_requested": False,
        "last_error": None,
        "metadata": {"initial_action": "inbox.read", "scenario": "invalid_args"},
    }
    result = nodes.plan_node(state, use_fake_model=True)
    assert result["state"] == "failed"
    assert result["last_error"] == "schema_mismatch: arguments must be an object"
    print("✓ plan node scenario plumbing")


def test_plan_node_happy_path_survives():
    """The default happy path still plans successfully through validation."""
    state = {
        "plan_id": "p2", "user_id": "u1", "state": "planned",
        "steps": [], "current_step_index": 0, "turn_count": 0,
        "overall_budget_seconds": 300, "budget_consumed_seconds": 0.0,
        "created_at": "2026-01-01T00:00:00", "updated_at": "2026-01-01T00:00:00",
        "completed_at": None, "cancellation_requested": False,
        "last_error": None,
        "metadata": {"initial_action": "inbox.read"},
    }
    result = nodes.plan_node(state, use_fake_model=True)
    assert result["state"] == "planned", result.get("last_error")
    assert result["steps"][0]["tool"] == "inbox.read"
    print("✓ plan node happy path survives")


def test_catalogue_family_join_complete():
    """Every catalogue family maps to at least one enumerated operation."""
    families = load_catalogue_families()
    assert sorted(families.keys()) == [
        "calendar_tasks", "finance", "inbox", "integrations",
        "notes_memory", "resume_jobs", "trips",
    ]
    print("✓ catalogue family join complete")


def run_all():
    test_happy_path_passes()
    test_unenumerated_tool_denied()
    test_family_mismatch_denied()
    test_non_object_arguments_denied()
    test_extra_field_denied()
    test_url_in_command_target_denied()
    test_sql_in_query_denied()
    test_shell_chain_denied()
    test_prose_content_not_scanned()
    test_catalogue_missing_file_fails_closed()
    test_fake_model_matches_catalogue()
    test_from_dict_unknown_state_fails_closed()
    test_route_after_plan_fail_closed()
    test_plan_node_scenario_plumbing()
    test_plan_node_happy_path_survives()
    test_catalogue_family_join_complete()
    print("\n✓ All layer 3 tests passed!")


if __name__ == "__main__":
    run_all()
