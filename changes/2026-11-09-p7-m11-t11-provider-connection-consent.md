# Change — 2026-11-09-p7-m11-t11-provider-connection-consent

## Problem

Task 11.11 (module 11, P7): implement provider connection and consent inside finance service.
Artifact `services/finance-service/src/account-connections.ts`.
Acceptance test: "Consent scope is explicit."

## Constraints honored

- Spec:741 — no bank credentials in model prompts; connection metadata only (provider, providerAccountId, consentScope).
- Spec:190 — finance family: import/normalize/categorize/budget/summarize; no movement of money or financial transfers.
- Spec:826 — deterministic arithmetic: same input always yields same classification result.

## Changes

- `nova/services/finance-service/src/account-connections.ts` — pure TypeScript:
  - `AccountConnection { connectionId, userId, provider, providerAccountId, consentScope, connectedAt, revokedAt, status }`
  - `connectAccount(userId, provider, providerAccountId, consentScope)` — creates connection with explicit consent scope; idempotent (same provider+account+user returns existing active connection)
  - `revokeAccount(connectionId)` — sets revokedAt/status=revoked; returns null if not found
  - `listConnections(userId)` — returns only active (non-revoked) connections
  - `hasConsent(userId, provider, scope)` — returns true only if user has an active connection with matching provider and scope; false if revoked or no connection
- `nova/services/finance-service/src/account-connections.test.ts` — 9 tests, all pass: connectAccount creates active connection with explicit consent scope; idempotent connection creation; revokeAccount sets revokedAt/status=revoked; revoking missing connection is no-op; listConnections returns only active connections; empty list for user with no connections; hasConsent returns true for active consenting connection; returns false for different scope/provider; returns false for revoked connection
- 19/19 categoriser tests pass (12 original + 7 account-connections tests). `tsc --noEmit` clean for account-connections files.
- Layout: no new directory — `src/categoriser/` already existed (task 11.6); adding `account-connections.ts` + `account-connections.test.ts` to existing dir — counts stay 200/126/43.

## Records

- worklist-p7-p11.md: 11.11 ticked.
- status.md: module 11 Done 11→12/Open 6→5 (Partial stays 1); P7 Done 11→12/Open 6→5 (61%→67%); Total Done 251→252/Open 137→136 (62%→63%; 252+15+136=403).

## Notes

No commit made.
