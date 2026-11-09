# Change — 2026-11-09-p7-m11-t12-provider-config-flag

## Problem

Task 11.12 (module 11, P7): add Plaid or India Account Aggregator behind a config flag.
Artifact `services/finance-service/src/providers.ts`.
Acceptance test: flag off means CSV only.

## Constraints honored

- Spec:741 — no bank credentials in model prompts; connection metadata only.
- Spec:190 — finance family: import/normalize/categorize/budget/summarize; no movement of money.
- Flag off means CSV only; flag on means provider available; P9 registry reads only status.

## Changes

- `nova/services/finance-service/src/providers.ts` — pure TypeScript:
  - `ProviderAdapter { provider, enabled, status }`
  - `getProviderAdapter(provider)` — returns adapter or null if disabled (flag off)
  - `isProviderEnabled(provider)` — config flag check via env var
  - `resetProviderConfigForTest()` — clears env for test isolation
  - PLAID_ENABLED=1 enables Plaid; AA_ENABLED=1 enables AA; all other providers disabled
- `nova/services/finance-service/src/providers.test.ts` — 4 tests, all pass:
  - adapter returned when provider enabled
  - null returned for unknown provider
  - flag off means CSV only (isProviderEnabled false)
  - flag on means provider available (PLAID_ENABLED=1 enables Plaid only)
- 53/54 finance-service tests pass (1 pre-existing: `mcp/server.test.js` — `@nova/contracts` dist not built, unrelated). `tsc --noEmit` clean for providers files.
- Layout: `src/providers.ts` added to existing `src/` dir — no directory count change (200/126/43).

## Records

- worklist-p7-p11.md: 11.12 ticked.
- status.md: module 11 Done 12→13/Open 5→4; P7 Done 12→13/Open 6→5 (67%→72%); Total Done 252→253/Open 136→135 (62%→63%).

## Notes

No commit made.
