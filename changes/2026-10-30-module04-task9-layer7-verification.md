# 2026-10-30: Module 04 Task 9 — Layer 7 independent verification

## Summary

Implemented Layer 7 of Module 04 scope lock: independent output and side-effect verification. The verifier now returns a three-state result (pass/fail/unknown) instead of a simple boolean, and unknown verification results map to a new `NEEDS_VERIFICATION` workflow state.

## Approach review

Two negation subagents reviewed the approach and forced multiple corrections:

1. **Don't break `verify()` return type** — Added `verify_detailed()` returning `VerificationResult`; kept `verify()` returning `bool` for backward compatibility.
2. **Add `NEEDS_VERIFICATION` to `WorkflowState` enum** — The only existing state that can represent "unknown" without failing the workflow.
3. **Evidence store with `record_evidence()`** — Kept exact-match for tool output; added mutable store for runtime recording.
4. **`execute_node` maps `unknown` → `NEEDS_VERIFICATION` state** — Not `FAILED`. Workflow pauses for review.
5. **Move `Verifier` to `orchestrator/verify/verifier.py`** — Real implementation, not stub.
6. **`VerificationResult` type and `verify_detailed()`** — Keep `verify()` returning `bool` for backward compatibility; `verify_detailed()` returns `VerificationResult` with pass/fail/unknown.
7. **Fake model scenarios** — Added `verification_pass`, `verification_fail`, `verification_unknown`.
8. **Removed duplicate `Verifier` from `nodes.py`** — Import from new module.

## Changes

### `orchestrator/verify/verifier.py` (new, 165 lines)
- `EvidenceStore` with mutable `record_evidence()` and exact-match lookup
- `VerificationResult` type with pass/fail/unknown status
- `Verifier` class with `verify()` (bool) and `verify_detailed()` (three-state)
- `SideEffectVerifier` interface for future side-effect checks
- `Evidence` and `SideEffectEvidence` dataclasses

### `orchestrator/workflows/state.py`
- Added `NEEDS_VERIFICATION` to `WorkflowState` enum
- `Step.result` type changed to `Optional[UntrustedPayload]`
- `WorkflowStateData.from_dict` reconstructs `UntrustedPayload` from dict

### `orchestrator/workflows/agent_workflow.py`
- Imports `Verifier`, `VerificationResult`, `EvidenceStore` from new module
- `execute_node` uses `verify_detailed()`; maps `unknown` → `NEEDS_VERIFICATION` state
- Unwraps `step.result.data` for verification
- `route_after_execute` handles `NEEDS_VERIFICATION` → `finalize`

### `orchestrator/verify/verifier.py` (new)
- Full verifier implementation with `EvidenceStore`, `VerificationResult`, `SideEffectVerifier`

### `orchestrator/workflows/nodes.py`
- Removed duplicate `Verifier` class (now imports from `verify.verifier`)

### `orchestrator/workflows/test_layer3.py` (6 new tests)
- `test_verifier_evidence_store`
- `test_verifier_pass`
- `test_verifier_fail`
- `test_verifier_unknown`
- `test_verifier_bool_backward_compat`
- `test_verification_result_unknown_maps_to_needs_verification`

### `orchestrator/verify/__init__.py`
- Exports new verifier module

### `tests/fixtures/fake-model/fake_model.py`
- Added `VERIFICATION_PASS`, `VERIFICATION_FAIL`, `VERIFICATION_UNKNOWN` scenarios
- Added `build_verification_pass_response`, `build_verification_fail_response`, `build_verification_unknown_response`

### `orchestrator/workflows/state.py`
- Added `NEEDS_VERIFICATION` to `WorkflowState` enum

## Verification

- All 156 policy service tests pass (was 150)
- Layer 3 tests: 22/22 (6 new verifier tests)
- Orchestrator tests: 5/5
- All other suites pass: contracts 183, audit 12, api-gateway 50, model gateway 7, router 17, fake model 8, model registry 6, orchestrator 5
- Layout checker: 28/28 checks pass
- `repo.md` updated with Layer 7 completion status

## Not in this task

- Layer 8 (auditable denials): Module 04 Task 10
- Layer 9 (block self-extension): Module 04 Task 11
- Layer 10 (admin plane network rule): Module 04 Task 12
- Red-team suite: Module 04 Tasks 13-15
- CI wiring for red-team: Module 04 Task 17
- PII exfiltration case: Module 04 Task 19
- MCP surface inside scope lock: Module 04 Task 20