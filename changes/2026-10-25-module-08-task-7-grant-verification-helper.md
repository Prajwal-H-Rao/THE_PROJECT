# 2026-10-25 — Module 08 task 7 — grant-verification helper for domain services

## Scope

Grant verification helper that domain services (inbox, calendar, jobs) use to verify and consume approval grants (Module 08 task 7, plan `docs/plan/08-policy-approval.md` task 7). Spec:778 — "the approval is bound to the payload hash, nonce and expiry".

## Implementation

### Contracts package (`packages/contracts/grant-verification.ts`)

New export `./grant-verification` in `@nova/contracts`:

- `GrantVerificationClient` — HTTP client for the policy-approval-service grants endpoints
  - `verifyGrant(nonce, options)` — verifies grant before action execution
  - `consumeGrant(nonce)` — consumes grant after successful action
  - `verifyAndConsume(nonce, options)` — convenience method (verify then consume)
  - `getGrantCard(nonce)` — fetches card for display (validates service match)
  - `static verifyPreviewHash(preview, cardHash)` — client-side hash verification
  - `createGrantVerificationClient()` — factory using env vars (`POLICY_APPROVAL_SERVICE_URL`, `SERVICE_NAME`)

- Types exported:
  - `GrantVerifyResult` — `{ ok: true } | { ok: false, reason }`
  - `GrantConsumeResult` — `{ ok: true, consumedAtMs } | { ok: false, reason }`
  - `GrantCard` — `{ target, preview, permissions, consequence, expiresAtMs, cardHash }`
  - `GrantVerificationConfig` — `{ baseUrl, serviceName, fetch? }`
  - `GrantVerificationError` — error with `code`, `message`, `status`

### Tests (`grant-verification.test.ts`, 10 tests)

- `verifyGrant` success and failure with reasons
- `consumeGrant` success and `already_used` rejection
- `getGrantCard` success and 404 handling
- `verifyAndConsume` flow (success and fast fail on verify failure)
- Error handling for non-OK responses
- `verifyPreviewHash` static method matches `computeApprovalHash`
- Factory function reads env vars

### Integration

- Added to `@nova/contracts` exports as `./grant-verification`
- Added to contracts `tsconfig.json` include list
- Added to contracts `package.json` exports and test script
- 10 new tests in contracts suite (66 total)

### Layout records

- Added to `record_paths.py` group 10 (contracts files)
- Updated `layout-diff.md` tenth group sentence
- Layout checker passes (105/74/37)

## Verification

- Contracts `npm test`: 66 pass, 0 fail (10 new tests)
- Policy service `npm test`: 81 pass, 0 fail
- `python3 nova/tests/layout/check_layout.py`: all checks passed

## Notes

- This helper is consumed by domain services (inbox, calendar, jobs) in P6 and P8
- Does NOT contain business logic — only HTTP communication
- Server-side enforcement remains in policy-approval-service
- Client-side hash verification is defense-in-depth; server-side `verifyBinding` is the primary gate
- Two pre-existing `test_layout_checks.py` failures at HEAD are unrelated and unchanged