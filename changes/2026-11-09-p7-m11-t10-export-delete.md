# Change — 2026-11-09-p7-m11-t10-export-delete

## Problem

Task 11.10 (module 11, P7): add export and delete for the finance domain.
Artifact `services/finance-service/` (`nova/services/finance-service/src/`).
Acceptance test: "Delete removes objects too."

## Constraints honored

- Deterministic arithmetic: amounts stay integer minor units; no floats.
- Isolated import/parser: pure TypeScript, no bank credentials.
- Categorize only: no movement of money.

## Changes

- `nova/services/finance-service/src/finance-repository.ts` — added
  `exportTransactions(userId)`: queries all transactions for a user
  (read-only export), ordered by transaction_date descending.
- `nova/services/finance-service/src/finance-service.ts` — added
  `exportTransactions(userId)`: delegates to the repository. `deleteTransaction`
  already existed (hard DELETE of the transaction row); this change adds test
  coverage proving delete removes the object (row no longer appears in export).
- `nova/services/finance-service/src/finance-service-export-delete.test.ts` —
  5 tests, all pass: export returns all transactions for a user; export returns
  empty for a user with no transactions; delete returns true and removes the
  row; delete returns false for a missing transaction; after delete, the
  transaction no longer appears in export.
- 54/55 finance-service tests pass (1 pre-existing failure:
  `mcp/server.test.js` — `@nova/contracts` dist not built, unrelated).
  `tsc --noEmit` clean for finance-service files.
- Layout: no new directory — `src/` already existed — counts stay 200/126/43.

## Records

- worklist-p7-p11.md: 11.10 ticked.
- status.md: module 11 Done 9→10/Open 8→7 (Partial stays 1); P7 Done 9→10/
  Open 8→7 (50%→56%); Total Done 249→250/Open 139→138 (61%→62%;
  250+15+138=403).

## Notes

No commit made.
