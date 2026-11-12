# 2026-11-12 — P7 module 11 task 11.18: register trips operations with policy layer

## What changed

Task 11.18 ("Register the trips operations with the policy layer", `docs/plan/11-finance-trips.md:38`) is implemented. Trips operations are registered with the policy layer with argument schema, resource scope, risk tier, quota and verifier (spec:195). A trips call with an unregistered argument is denied.

New files:

- `nova/services/policy-approval-service/src/policy/operation-registry.ts` (140 lines) — `OperationRegistration` interface (operationId, argumentSchema, resourceScope, riskTier, quota, verifier), `OperationRegistry` class with `registerOperation()`, `getOperation()`, `isRegistered()`, `validateArguments()`. `validateArguments()` rejects: unknown operation, unregistered argument (property not in schema), missing required argument. `registerTripsOperations()` pre-registers all four trips operations: trips.read, trips.write, trips.compare, trips.book. Exports `defaultRegistry` populated at module load.
- `nova/services/policy-approval-service/src/policy/operation-registry.test.ts` (82 lines) — 8 vitest tests: isRegistered for all 4 ops, isRegistered false for unknown ops, valid args pass validation, unregistered argument rejected, missing required argument rejected, unknown operation rejected, undefined args handled.

Modified files:

- `nova/services/policy-approval-service/src/policy/policy-schema.ts` — Added optional `arguments?: Record<string, unknown>` to `PolicyDecisionRequest` (backward compatible).
- `nova/services/policy-approval-service/src/policy/policy-decision.service.ts` — Imports `defaultRegistry` from operation-registry. In `decide()`, after `findMatchingRule` returns a rule and before the `needs_approval` early return: if `rule.id` starts with `"trips."`, validates `request.arguments` against the registry; unregistered arguments are denied with `ruleId: "unregistered_argument"`. Non-trips rules skip registry validation entirely.
- `nova/services/policy-approval-service/src/policy/policy-decision.service.test.ts` — Updated rule count 34→35 (trips.book brings trips family to 4 rules).
- `docs/plan/status.md` — Module 11 row (18 done, 0 partial, 0 open, Complete), P7 phase row (100%), total row (258 done, 130 open).
- `docs/plan/worklist-p7-p11.md` — 11.18 ticked.
- `repo.md` — P7 status line updated to 100%.

## Proof

- `npx tsc --noEmit` — no new type errors (only pre-existing in policy-version.test.ts).
- `node --test dist/policy/operation-registry.test.js` — 8 tests, all pass.
- `node --test dist/policy/policy-decision.service.test.js` — 16 tests, all pass (including updated rule count 35).
- All other policy test files pass (26 loader, 15 schema, 13 bulk, 5 chat-approval, 2 authorization, 10 denial-metrics, 12 usage-counter). Only pre-existing policy-version.test.ts failures remain (unrelated).
- `python3 nova/tests/layout/check_layout.py` — all checks pass.

## Negation loop

Two subagents signed off across two rounds. Round 1 blockers: no registration wiring (defaultRegistry empty), operationId mismatch (rule.id vs action), quota unspecified, trips.compare not registered, decideBulk bypass, universal validation breaks non-trips rules. Round 2 confirmed all resolved: registerTripsOperations called at module load, rule.id used as operationId, all 4 trips ops registered, validation scoped to trips family only, `.js` imports matching build pipeline convention, files under 200 lines. Both negators: "no blocking objections. The approach is sound."

## Doc updates

- `docs/plan/status.md`, `docs/plan/worklist-p7-p11.md`, `repo.md` updated.
- Changelog entry created.

## Not done here

- All P7 tasks are now complete (100%). P8 (jobs agent and registry) starts next.
