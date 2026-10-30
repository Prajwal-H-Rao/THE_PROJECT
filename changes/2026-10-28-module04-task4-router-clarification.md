# 2026-10-28: Module 04 task 4 — Layer 2 router scope clarification

## Summary

Implemented Layer 2 of Module 04 scope lock: the deterministic router now asks for clarification instead of inferring an action.

## Approach review

Two negation subagents reviewed the approach and forced four corrections:

1. Reuse the existing `action_type="ambiguous"` outcome. No new outcome literal.
2. Clarify on ambiguity only, never on policy risk gating. The router reads no policy rules.
3. Clarify also when a family matches but zero actions match (`help me with my email situation` used to return an inferred `read` at 0.9 confidence).
4. Single-source keyword table; fail-closed wrapper on `route()`.

The second negator corrected the probe facts: 13 test functions and 12 routed texts, not 14. It also required the table in a sibling module (`router.py` was already 235 lines, past the 200-line rule), two new acceptance tests, and a drift check against the families YAML. Both negators then signed off with the corrections applied.

## Changes

### `nova/services/agent-orchestrator/orchestrator/router/action_table.py` (new, 118 lines)

- `TASK_ACTIONS`: one nested table `family → {action → keyword fragments}`. Action keys mirror the policy YAML rule ids.
- `FAMILIES`: canonical family order.
- `derive_family_keywords()`: derives the family keyword lists from the table. No parallel keyword dict, so no silent drift.

### `nova/services/agent-orchestrator/orchestrator/router/router.py` (rewrite, 191 lines)

- Family and action patterns both compile from the table.
- Within-family clarification: two or more matched actions, or zero matched actions, returns `ambiguous` with a bounded question (`family=None`, `tier=None`). A single clear action routes directly.
- Cross-family tie-break keeps its old logic and keeps passing.
- `route()` wraps `_route()`: an unexpected exception is logged and returns a fixed refusal string with no echo of user input. Keeps the `DeterministicRouter` class name and constructor.
- Kept under the 200-line rule.

### `test_router.py` (4 new tests, 17 total)

- `test_within_family_action_tie`: `invite my team to the meeting` asks, does not act.
- `test_keywordless_family_request`: `help me with my email situation` asks.
- `test_unexpected_error_fails_closed`: injected crash returns the fixed refusal.
- `test_action_table_matches_policy_yaml`: diffs every table action set against the families YAML rule ids, so table drift fails a test.

## Verification

- Router: 17/17. Contracts 183, policy 130, audit 12, api-gateway 50, model gateway 7, fake model 8, model registry 6, orchestrator 5.
- Layout checker: all 28 checks pass, counts unchanged (129 dirs, 88 leaves, 37 placeholders).
- `repo.md` build status updated.

## Not in this task

- Graph wiring of the router and the constrained-planning layer (Layer 3): those are Module 04 task 5, with an explicit conditional edge — never a fall-through default.
