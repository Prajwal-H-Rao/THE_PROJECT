# 2026-11-04 — P8 task 6: verified_permitted poll gate

## Problem

P8 module 13 task 6 requires the `verified_permitted` gate: no poll before `source_permission_reviewed`. Test: "Unverified source is never polled." No gate existed and no worker module existed.

## Changes

- `nova/services/employer-registry-service/src/poll-gate.ts` — the gate:
  - `POLLABLE_STATES` is DERIVED from the lifecycle `LEGAL_TRANSITIONS` map, never hand-maintained: states with a legal edge to `polling`, plus `polling` itself, minus `manual_only`/`paused` (spec:633 user-action states). Derived result: `connector_configured, polling, healthy, no_openings, rate_limited`.
  - `source_permission_reviewed` REFUSES — round-1 flaw fixed: the lifecycle itself forbids `source_permission_reviewed → polling` (throws, pinned by the 12×12 matrix test), and spec:638/577 require a verified access method (configured connector) before any request.
  - `canPoll(state)` fail-closed (unknown states, including the production start state `needs_verification`, refuse). `guardPoll(state)` throws — the entry point every future poller (tasks 15-16) must call.
  - Contract comment: canPoll is necessary, not sufficient — due time, jitter, concurrency, ETag are the scheduler's jobs.
- `nova/services/employer-registry-service/src/poll-gate.test.ts` — 4 tests: derived set is exactly the 5 expected states; 9 refusal states refuse both canPoll and guardPoll (with explicit `needs_verification` case); pollable states pass; every pollable state is a lifecycle state.

## Verification

- Test run executed for real: `node --experimental-strip-types` on temp copies (import specifiers rewritten) → 4 tests, 4 pass, 0 fail. No external dependencies.
- `python3 nova/tests/layout/check_layout.py` → exit 0, counts unchanged (182/112/43).
- `python3 nova/tests/layout/test_layout_checks.py` → exit 0, every mutation rejected.
- Both negators returned SOUND on revision 2 (derivation machine-verified against the real transition map by both).

## Notes

- Steady-state cycle verified coherent: state rests on `polling` between 24h polls (spec:581); gate passes there; outcome calls `transition("polling", healthState)`.
- Excluding `source_permission_reviewed` from the pollable set is stricter than the task floor text and satisfies plan:78 (`test_no_poll_before_permission_review` — zero requests from unverified sources).
