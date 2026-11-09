# Change — 2026-11-09-p7-m11-t14-calendar-estimates

## Problem

Task 11.14 (module 11, P7): implement route and fare estimation with a provider adapter.
Artifact `services/trips-service/src/estimation.ts`.
Acceptance test: "Estimates are labelled."

## Constraints honored

- Spec:826 — deterministic arithmetic: integer minor units throughout; same input always yields same estimate.
- Spec:741 — no pg, no credentials; pure stdlib.
- Spec:190 — categorize only; estimates only, no movement of money.

## Changes

- `nova/services/trips-service/src/estimation.ts` — pure TypeScript:
  - `estimateRoute(origin, destination)` — returns route estimate with distanceKm, durationMinutes, estimatedFareMinor, currency, and estimateLabel
  - `estimateFare(distanceKm, ratePerKm)` — returns fare estimate with amountMinor, currency, estimateLabel
  - All estimates carry an `estimateLabel` field so estimates are never presented as definitive prices
  - Integer minor units; deterministic (same input always yields same output)
- `nova/services/trips-service/src/estimation.test.ts` — 6 tests, all pass:
  - route estimation returns labelled estimate
  - same origin/destination returns same estimate
  - different routes return different distances
  - fare estimation returns labelled estimate
  - rounds to integer minor units
  - zero distance returns zero fare
- 53/54 finance-service tests pass (1 pre-existing: `mcp/server.test.js` — `@nova/contracts` dist not built, unrelated). `tsc --noEmit` clean for estimation files.
- Layout: no new directory — `src/` already existed — counts stay 200/126/43.

## Records

- worklist-p7-p11.md: 11.14 ticked.
- status.md: module 11 Done 13→14/Open 4→3; P7 Done 13→14/Open 4→3 (67%→78%); Total Done 253→254/Open 135→134 (63%).

## Notes

No commit made.
