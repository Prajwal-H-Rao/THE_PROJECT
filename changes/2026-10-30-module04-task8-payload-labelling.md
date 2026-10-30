# 2026-10-30: Module 04 task 8 — Layer 6 payload labelling

## Summary

Implemented Layer 6 of Module 04 scope lock: label every external payload untrusted. All MCP tool results are now wrapped in an `UntrustedPayload` wrapper that enforces they cannot change policy (spec:216).

## Approach review

Two negation subagents reviewed the approach and forced corrections:

1. **Layer 6 labels only MCP tool results** (`step.result`), not model arguments (`step.arguments`). The fake model's injection scenario targets model arguments (Layer 3), while Layer 6 targets MCP tool outputs (e.g., email body from `inbox.read`).
2. **Single `Step` definition** — Consolidated to `state.py`; `agent_workflow.py` now imports from there. Legacy `nodes.py` marked deprecated.
3. **`UntrustedPayload` as dict-compatible wrapper** — Dataclass with `to_dict()`/`from_dict()` for serialization; `WorkflowStateData.from_dict` reconstructs `UntrustedPayload` from dict.
4. **Downstream consumers unwrap `.data`** — `execute_node` unwraps `step.result.data` before passing to `verifier.verify` / `validators.validate_enum`.
5. **Layer 6 = labelling only** — No policy enforcement (that's Layer 7). Test only verifies labelling occurs.
6. **Fake MCP injection fixture** — Added `build_mcp_injection_response_for_mcp` to `fake_model.py` returning injected tool output (e.g., email body with injection).
6. **MCP envelope handling** — Wrap only the extracted `result.get("result")` (tool output), not the full MCP envelope.
7. **Deprecate `nodes.py`** — Added deprecation comment; tests use `agent_workflow.py` path.

## Changes

### `orchestrator/workflows/state.py`
- Added `UntrustedPayload` dataclass with `data`, `source_tool`, `trusted=False`, `received_at`, `to_dict()`, `from_dict()`.
- `Step.result` type changed from `Optional[Dict]` to `Optional[UntrustedPayload]`.
- `WorkflowStateData.from_dict` reconstructs `UntrustedPayload` from dict (handles both wrapped and legacy plain dict formats).
- Fields reordered to satisfy dataclass field ordering rules.

### `orchestrator/workflows/agent_workflow.py`
- Removed duplicate `Step`, `WorkflowStateData`, `WorkflowState`, `StepStatus` definitions; imports from `state.py`.
- `execute_node` wraps MCP tool output in `UntrustedPayload(trusted=False)`.
- Unwraps `step.result.data` for `verifier.verify` and `validators.validate_enum`.
- Added `UntrustedPayload` to imports.

### `orchestrator/workflows/nodes.py`
- Added deprecation comment; imports from `state.py`.

### `orchestrator/workflows/test_layer3.py`
- Added `UntrustedPayload` import.
- New tests: `test_untrusted_payload_wrapping`, `test_untrusted_payload_from_dict_legacy`, `test_untrusted_payload_legacy_format`.

### `tests/fixtures/fake-model/fake_model.py`
- Added `Scenario.MCP_INJECTION` enum value.
- Added `build_mcp_injection_response` (returns `ModelResponse` with injected tool args).
- Added `build_mcp_injection_response_for_mcp` (returns fake MCP response with injected email body).
- Added `Scenario.MCP_INJECTION` to `SCENARIO_BUILDERS`.

### `orchestrator/workflows/nodes.py`
- Added deprecation comment at top.

### `orchestrator/workflows/state.py`
- Added `UntrustedPayload` dataclass with `to_dict`/`from_dict`.
- `Step.result` type changed to `Optional[UntrustedPayload]`.
- `WorkflowStateData.from_dict` reconstructs `UntrustedPayload` from dict (handles both wrapped and legacy plain dict formats).

## Verification

- Layer 3 tests: 19/19 pass (added 3 new tests for `UntrustedPayload`).
- Orchestrator tests: 5/5 pass.
- All other test suites pass (Contracts 183, Policy 156, Audit 12, API Gateway 50, Model Gateway 7, Router 17, Fake Model 8, Model Registry 6, Orchestrator 5).
- Layout checker: 28/28 pass, counts unchanged (129 dirs, 88 leaves, 37 placeholders).
- `repo.md` updated with Module 04 Task 8 status.

## Not in this task

- Layer 7 (independent verification): Module 04 Task 9 — will consume the labelled payload and enforce policy.
- Layer 8 (auditable denials): Module 04 Task 10.
- Red-team suite: Module 04 Tasks 13-15.