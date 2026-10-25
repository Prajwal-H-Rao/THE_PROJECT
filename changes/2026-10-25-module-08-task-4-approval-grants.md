# 2026-10-25 — Module 08 task 4 — approval grant record bound to payload hash, user, target, expiry, nonce

## Scope

The approval record (Module 08 task 4, plan `docs/plan/08-policy-approval.md` task 4). Spec:778: "the approval is bound to the payload hash, nonce and expiry".

## Decision (design note: `docs/design-notes/nova-approval-grants.md`)

- The plan test says "any byte change invalidates it". The binding is defined over **canonical JSON bytes**: keys sorted by UTF-16 code unit, no whitespace, ECMAScript number semantics, `-0` equals `0`, object properties holding `undefined` are omitted, array items holding `undefined` serialize as `null`. One changed canonical byte is one changed content byte; whitespace and key reordering never reach the hash.
- Throws, never collapses: `NaN`, `Infinity`, `BigInt`, cycles, and non-plain objects (`Date`, `Map`). A silent collapse would merge distinct payloads into one hash.
- Canonicalization authority stays server-side in TypeScript; the helper is the shared `@nova/contracts` export so domain services later reuse it.

## Implementation

### Contracts

- `packages/contracts/approval-hash.ts`: `canonicalPayload` + `computeApprovalHash` (SHA-256 hex over canonical bytes), `canonicalJson` exported.
- `packages/contracts/approval-hash.test.ts`: inline golden vectors (no JSON fixture would break the tree counts). Pinned: nested-object hash `fa4e5ad9…39a`, mail hash `45148125…e0a`, unicode code-unit ordering, `-0`, undefined rules, throw cases.
- `tsconfig.json` include list: both new files appended (the include list is explicit; without this the build emits nothing and CI goes red).
- `package.json`: export `./approval-hash`; test script runs `dist/approval-hash.test.js`. Suite: 55 pass.

### Migration

- `packages/contracts/migrations/24-approval-grants.sql`: ALTER `policy_approval_service.approvals` — `nonce TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text` (comment names the minted 32-char hex format), `service`, `policy_version`, `consumed_at`, `revoked_at`. `consumed_at`/`revoked_at` are the authoritative single-use state for task 5.

### Service (`nova/services/policy-approval-service/src/approval/`, provisioned placeholder slot, `.gitkeep` removed)

- `grant-binding.ts`: pure `verifyBinding` — checks, first failure wins: `invalid_user` (UUID format), `payload_hash_mismatch`, `user_mismatch`, `service_mismatch`, `target_mismatch`, `expired`, `revoked`, `policy_version_mismatch` (string-coerced).
- `grants.service.ts`: `createGrant` mints its own `randomBytes(16)` nonce (32-hex); the decide endpoint's 16-hex timestamp nonce is never the grant key, so the UNIQUE column cannot collide from that source. Validation errors as `GrantValidationError` code + message. In-memory `GrantRepository` (declared stub; Postgres is unavailable locally).
- `grants.controller.ts`: `POST /policy/grants`, `POST /policy/grants/:nonce/verify`. Internal RPC; caller trust comes in tasks 7/10. DTOs are plain interfaces by house style; service-level guards do the work. The verify endpoint overrides `nowMs` with the server clock (a caller-supplied clock is stripped), so expiry holds on the wired path; the injectable clock stays service-level for tests and trusted callers.
- `grants.module.ts` wired into `app.module.ts`.
- `src/approval/grants.test.ts`: 11 node:test cases — create/verify, canonical retransmission (key order), one-material-change invalidation, non-UUID user, cross-user/service/target, expiry, policy version (numeric form still verifies), unknown nonce, validation codes, wired-expiry clock strip. Suite: 64 pass, 0 fail, no DB.

### Layout records (checker now: "all checks passed", 105 dirs / 74 leaves / 37 placeholders)

- `tree_checks.py`: `EXPECTED_PLACEHOLDERS` 38 → 37.
- `record_paths.py`: `DESIGN_NOTES` gains `nova-approval-grants.md`; migrations group gains `(24, "approval-grants")`.
- `docs/layout-diff.md`: the seventh path-group sentence gains the note; the ninth path-group sentence gains `24-approval-grants.sql`; counts sentence reports 37 placeholders.

## Verification

- Contracts `npm test`: 55 pass, 0 fail.
- Policy service `npm test`: 64 pass, 0 fail (compiles through `nest build`, runs without a DB).
- `python3 nova/tests/layout/check_layout.py`: all checks passed.
- Gateway: untouched, no change needed for task 4.
- CI gap stated honestly: no policy-service CI job exists; these tests are local-only today.

## Notes

- Two pre-existing `test_layout_checks.py` failures at HEAD are unrelated and unchanged.
- Decide endpoint's weak 16-hex timestamp nonce is left unchanged (task 4 scope); grants never reuse it.
