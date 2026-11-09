# Change — 2026-11-09-p7-m11-t08-review-queue

## Problem

Task 11.8 (module 11, P7): implement ambiguous-import review queue.
Artifact `services/finance-service/categoriser/` (`nova/services/finance-service/src/categoriser/review-queue.ts`).
Acceptance test: "Queue surfaces only uncertain rows."

## Constraints honored

- Deterministic arithmetic: same queue state always yields the same output
  (no floating-point for money; amounts stay integer minor units).
- Isolated import/parser: pure TypeScript, no pg/DB, no bank credentials.
- Categorize only: no movement of money.

## Changes

- `nova/services/finance-service/src/categoriser/review-queue.ts` —
  `ReviewQueue` class:
  - `enqueue(row)` — queues an import row awaiting review.
  - `getUncertainRows(threshold)` — returns only rows whose confidence is
    below the threshold (uncertain rows), in enqueue order. Confirmed /
    high-confidence rows are excluded.
  - `resolve(transactionId, finalCategory)` — removes a row from the queue
    once reviewed (no-op if not queued).
  - `getQueue()` — returns all pending rows in enqueue order.
- `nova/services/finance-service/src/categoriser/review-queue.test.ts` —
  7 tests, all pass: queue all pending rows, uncertain rows below threshold,
  boundary confidence equal to threshold excluded, resolve removes a row,
  resolve on missing transaction is a no-op, deterministic same-state-same-
  output, empty queue returns none.
- 19/19 categoriser tests pass (12 original + 7 new). `tsc --noEmit` clean
  for categoriser files.
- Layout: `src/categoriser/` already existed (task 11.6) — no directory or
  leaf count change (199/125/43 unchanged).

## Records

- worklist-p7-p11.md: 11.8 ticked.
- status.md: module 11 Done 8→9/Open 9→8 (Partial stays 1); P7 Done 8→9/
  Open 9→8 (44%→50%); Total Done 248→249/Open 140→139 (61%;
  249+15+139=403).

## Notes

No commit made.
