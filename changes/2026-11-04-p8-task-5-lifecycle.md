# 2026-11-04 — P8 task 5: registry lifecycle state machine

## Problem

P8 module 13 task 5 requires the full spec:562 lifecycle: six pipeline states plus six health states, with legal transitions only. Test: "An illegal transition fails." No lifecycle module existed.

## Changes

- `nova/services/employer-registry-service/src/lifecycle.ts` — pure state-machine module:
  - `PIPELINE_STATES` (6, linear): seeded → identity_verified → career_url_verified → source_permission_reviewed → connector_configured → polling. One step forward, no skip, no backward.
  - `HEALTH_STATES` (6): healthy, no_openings, source_changed, rate_limited, manual_only, paused.
  - `LEGAL_TRANSITIONS` map, 17 edges: 5 pipeline steps, 6 polling→health (poll outcome), 3 recovery (healthy/no_openings/rate_limited → polling), 2 explicit user resume (manual_only/paused → polling, spec:633 pause/resume control), 1 forced re-verification (source_changed → career_url_verified — never directly to polling, per spec:558 verify-before-polling).
  - `transition(current, target)` throws on illegal transition or unknown state.
- `nova/services/employer-registry-service/src/lifecycle.test.ts` — node:test enumerating the full 12×12 matrix: exactly 17 legal edges declared, every legal pair resolves, every unlisted pair throws (127 illegal), plus targeted tests: source_changed → polling throws, pipeline skips/backward throw, unknown states throw.

## Verification

- Test run executed for real: `node --experimental-strip-types` on a temp copy (import specifier rewritten `.js`→`.ts`) → 6 tests, 6 pass, 0 fail. The module has zero external dependencies.
- `python3 nova/tests/layout/check_layout.py` → exit 0, counts unchanged (182/112/43).
- `python3 nova/tests/layout/test_layout_checks.py` → exit 0, every mutation rejected.
- Both negators returned SOUND. Conditions honored: full 12×12 matrix test (negator B condition), header comment documents user-action resume and task-6 worker gate, `./lifecycle.js` NodeNext import.

## Notes

- Pure module, no DB, no module wiring — same precedent as csv-importer.ts/validate.ts. Wiring lands with the worker (task 6) and reviewed imports (task 21).
- `needs_verification` (spec:558) is a row-level column default, not a lifecycle state — plan:24-26 binds the 12-state set.
- Health→health edges intentionally absent; tasks 15/23 may add them if needed.
