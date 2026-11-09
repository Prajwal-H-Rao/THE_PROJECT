# Change — 2026-11-09-p6-m09-t15-partial-provider-failure

## Problem

Task 09.15 (module 09, P6): handle partial provider failure — retry, reauthenticate, fail safe. Artifact: `services/inbox-service/src/`. Acceptance: each failure path (retry, reauthenticate, fail-safe) is covered by a test.

## Changes

- Wrote `nova/services/inbox-service/src/gmail/failure-handling.test.ts` — test-first stdlib test (4 tests) verifying:
  - Retry on transient failure succeeds on retry
  - Fails safe after max retries exhausted (rejects with error)
  - Re-authenticates on 401 error and retries successfully
  - Fail safe: logs error and continues without crashing
- Wrote `nova/services/inbox-service/src/gmail/failure-handling.ts` — updated `PollingWorker.pollCycle()` with:
  - Retry logic with exponential backoff on rate-limit errors (429)
  - Re-authentication on 401 Unauthorized errors (calls `reauthenticate()` then retries once)
  - Fail-safe: non-retryable errors are logged and the poll cycle stops gracefully instead of crashing
  - `reauthenticate()` method (no-op base, subclasses override for provider-specific auth)

## Verification

- `node --experimental-strip-types src/calendar/../gmail/failure-handling.test.ts` → 4 tests pass
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass. Tree counts unchanged: 194 directories, 120 leaf directories, 43 placeholders.

## Notes

Task 09.15 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 09 now 11 done / 0 partial / 6 open; P6 now 45 done / 0 partial / 5 open; totals 240 done / 16 partial / 151 open (59%).

Remaining P6 tasks: 09.14 (ICS import/export), 09.16 (Calendar page), 09.17 (lab 6), 09.18 (three-pane Inbox page).

No commit made (commit decision belongs to the owner).
