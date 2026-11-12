# 2026-11-12 — P7 module 11 task 11.16: gate booking behind an approval grant

## What changed

Task 11.16 ("Gate booking behind an approval grant", `docs/plan/11-finance-trips.md:36`) is implemented. Booking (a purchase-like action per spec:411) now requires an approval grant at the MCP layer, with no money movement in code (spec:190).

New files:

- `nova/services/trips-service/src/booking.ts` — deterministic `bookTrip(details, nowMs)` that creates a booking record. `booking_id` is a SHA-256 content hash of the trip details (same inputs → same id). Status is always "booked". No pg, no credentials, no model calls, no money movement (fare_minor is stored only).
- `nova/services/trips-service/src/booking.test.ts` — 7 tests: determinism (deepStrictEqual on repeated calls), status/fields, distinct ids for different inputs, injected nowMs, no money-transfer fields, catalogue `trips.book` is tier3 (grant required), idempotency_key.

Modified files:

- `nova/packages/contracts/mcp/catalogue/trips.json` — added `trips.book` operation at `risk_tier: "tier3"` (classification write, idempotency idempotency_key). The MCP registry (`validateAndAuthorizeCall`, registry.ts line 141) requires `approval_grant` for tier3/tier4 tools — missing grant → `approval_required`; invalid grant → `approval_revoked`.
- `nova/services/policy-approval-service/src/policy/families/trips.yaml` — added `trips.book` rule: tier3, `defaultDecision: "needs_approval"`, actor user, scope `trips:write`, target `own_trips`, allowedActions `["book"]`.

## Proof

- `node --test` over trips-service test files: 32 tests, all pass (7 new booking tests; 25 pre-existing untouched).
- `trips.json` parses; `trips.book` confirmed at `risk_tier: "tier3"`.
- `trips.yaml` parses; `trips.book` rule confirmed at tier3 / `needs_approval`.
- Ruff and mypy not installed; no Python files changed.

## Negation loop

Two subagents signed off: "no blocking objections. The approach is sound." Test objections (JWT setup, unique call_ids) were resolved by testing at the catalogue/booking level rather than through the MCP server (which can't resolve `@nova/contracts` from trips-service — pre-existing `.js`→`.ts` import issue affecting multiple test files).

## Doc updates

- `docs/plan/status.md` — module 11 row (16 done, 0 partial, 2 open), P7 phase row (89%), total row (256 done, 132 open).
- `docs/plan/worklist-p7-p11.md` — 11.16 ticked.
- `repo.md` — P7 status line updated to 89%.

## Not done here

- 11.17 (Finance and Trips page), 11.18 (register trips operations with policy) stay open.
