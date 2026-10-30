#!/usr/bin/env python3
"""Tests for the deterministic router."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from router import DeterministicRouter, RouterResult
from action_table import TASK_ACTIONS
from pathlib import Path


def test_inbox_read():
    router = DeterministicRouter()
    result = router.route("read my unread emails")
    assert result.family == "inbox"
    assert result.action_type == "read"
    assert result.tier == "planner"
    print("✓ inbox read test passed")


def test_inbox_send():
    router = DeterministicRouter()
    result = router.route("send email to john@example.com")
    assert result.family == "inbox"
    assert result.action_type == "consequential"
    assert result.tier == "planner"
    print("✓ inbox send test passed")


def test_calendar_read():
    router = DeterministicRouter()
    result = router.route("show my calendar for this week")
    assert result.family == "calendar_tasks"
    assert result.action_type == "read"
    print("✓ calendar read test passed")


def test_calendar_create_event():
    router = DeterministicRouter()
    result = router.route("create a meeting with the team tomorrow at 10am")
    assert result.family == "calendar_tasks"
    assert result.action_type == "write"
    print("✓ calendar create event test passed")


def test_notes_search():
    router = DeterministicRouter()
    result = router.route("search my notes for project alpha")
    assert result.family == "notes_memory"
    assert result.action_type == "read"
    print("✓ notes search test passed")


def test_finance_import():
    router = DeterministicRouter()
    result = router.route("import my bank statement from CSV")
    assert result.family == "finance"
    assert result.action_type == "write"
    print("✓ finance import test passed")


def test_trips_compare():
    router = DeterministicRouter()
    result = router.route("compare routes from NYC to Boston")
    assert result.family == "trips"
    assert result.action_type == "read"
    print("✓ trips compare test passed")


def test_jobs_apply():
    router = DeterministicRouter()
    result = router.route("submit my application for the Python developer role")
    assert result.family == "resume_jobs"
    assert result.action_type == "consequential"
    assert result.tier == "planner"
    print("✓ jobs apply test passed")


def test_integrations_link():
    router = DeterministicRouter()
    result = router.route("connect my telegram account")
    assert result.family == "integrations"
    assert result.action_type == "consequential"
    assert result.tier == "planner"
    print("✓ integrations link test passed")


def test_ambiguous_request():
    router = DeterministicRouter()
    # Test that clear requests to a single family are not marked ambiguous
    # (calendar and tasks are merged into calendar_tasks per spec)
    result = router.route("create a task for next week")
    assert result.family == "calendar_tasks"
    assert result.action_type == "write"
    print("✓ single-family request test passed")


def test_out_of_scope():
    router = DeterministicRouter()
    result = router.route("hack into the mainframe")
    assert result.action_type == "refusal"
    assert result.refusal_reason is not None
    print("✓ out of scope test passed")


def test_empty_request():
    router = DeterministicRouter()
    result = router.route("")
    assert result.action_type == "refusal"
    print("✓ empty request test passed")


def test_within_family_action_tie():
    router = DeterministicRouter()
    # "meeting" hints at create_event while "invite" names another action:
    # the router must ask, not infer a privileged action (spec:200).
    result = router.route("invite my team to the meeting")
    assert result.action_type == "ambiguous"
    assert result.family is None
    assert result.tier is None
    assert result.clarification is not None
    print("✓ within-family action tie test passed")


def test_keywordless_family_request():
    router = DeterministicRouter()
    # In-family but no action keywords: ask, never infer "read".
    result = router.route("help me with my email situation")
    assert result.action_type == "ambiguous"
    assert result.family is None
    assert result.tier is None
    assert result.clarification is not None
    print("✓ keywordless family request test passed")


def test_unexpected_error_fails_closed():
    router = DeterministicRouter()
    # Simulate an internal crash: route() must return the fixed refusal.
    def boom(_text):
        raise RuntimeError("injected failure")
    router._match_family = boom
    result = router.route("read my unread emails")
    assert result.action_type == "refusal"
    assert result.family is None
    assert result.refusal_reason == "This request could not be processed. Please rephrase it."
    print("✓ fail-closed on unexpected error test passed")


def test_action_table_matches_policy_yaml():
    # Drift guard: the static action table must mirror the families YAML ids.
    import yaml
    families_dir = (Path(__file__).parents[3]
                    / "policy-approval-service" / "src" / "policy" / "families")
    for family, actions in TASK_ACTIONS.items():
        with open(families_dir / f"{family}.yaml") as f:
            data = yaml.safe_load(f)
        yaml_ids = {rule["id"].split(".")[1] for rule in data["rules"]}
        table_actions = set(actions.keys()) - {"_family"}
        missing = table_actions - yaml_ids
        assert not missing, f"table has actions missing from {family}.yaml: {missing}"
    print("✓ action table / policy YAML drift test passed")


def test_tier_mapping():
    router = DeterministicRouter()
    # All families should map to planner tier in the default registry
    for family in ["inbox", "calendar_tasks", "notes_memory", "finance", "trips", "resume_jobs", "integrations"]:
        # We can't easily test without mocking registry, but verify structure
        assert family in router.routing_policy
    print("✓ tier mapping structure test passed")


def run_all():
    test_inbox_read()
    test_inbox_send()
    test_calendar_read()
    test_calendar_create_event()
    test_notes_search()
    test_finance_import()
    test_trips_compare()
    test_jobs_apply()
    test_integrations_link()
    test_ambiguous_request()
    test_out_of_scope()
    test_empty_request()
    test_tier_mapping()
    test_within_family_action_tie()
    test_keywordless_family_request()
    test_unexpected_error_fails_closed()
    test_action_table_matches_policy_yaml()
    print("\n✓ All router tests passed!")


if __name__ == "__main__":
    run_all()