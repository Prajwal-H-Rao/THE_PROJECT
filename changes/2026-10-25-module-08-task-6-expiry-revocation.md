# 2026-10-25 — Module 08 task 6 — expiry and revocation at policy check

## Scope

Expiry and revocation enforcement at the policy check (Module 08 task 6, plan
`docs/plan/08-policy-approval.md` task 6). Spec:778 — the approval is bound to
expiry and must be single-use; revocation is the admin complement to consumption.

## Decision (design note: `docs/design-notes/nova-approval-grants.md`)

- **Revoked-before-expiry precedence:** `verifyBinding` checks revocation before
  expiry. A grant that is both revoked and expired denies as `"revoked"` because
  revocation is an explicit admin action with audit semantics that supersedes
  natural expiry.
- **Mutually exclusive terminal states:** a grant can be **consumed** OR
  **revoked**, never both. The state machine enforces:
  - Active → consume → Consumed
  - Active → revoke → Revoked
  - Consumed → revoke → fails ("already_used")
  - Revoked → consume → fails ("already_revoked")
  - Revoked → revoke → idempotent success (returns original timestamp)
  - Consumed → consume → fails ("already_used")
- The conditional update for revocation is `UPDATE ... SET revoked_at = now()
  WHERE revoked_at IS NULL AND consumed_at IS NULL`. The in-memory repository
  emulates this with a synchronous check-and-set.
- `verifyBinding` checks revocation before expiry. A revoked grant denies as
  `"revoked"` regardless of expiry or consumption. A consumed grant's binding
  remains valid (binding validity ≠ consumption).

## Implementation

### Service (`nova/services/policy-approval-service/src/approval/`)

- `grants.service.ts`:
  - `GrantRepository` interface gains required `async tryRevoke(nonce, nowMs): Promise<RevokeVerdict>`.
  - `InMemoryGrantRepository.tryRevoke`: finds record, checks `consumedAtMs !== null` → fails "already_used"; checks `revokedAtMs !== null` → idempotent success (returns existing timestamp); else creates new `GrantRecord` with `revokedAtMs = nowMs`, saves, returns `{ ok: true, revokedAtMs }`.
  - `RevokeVerdict` type: `{ ok: true, revokedAtMs } | { ok: false, reason: "unknown_nonce" | "already_used" }`.
  - `ConsumeVerdict` widened to include `"already_revoked"` reason.
  - `InMemoryGrantRepository.tryConsume` now checks `revokedAtMs !== null` → fails "already_revoked".
  - `GrantsService.revokeGrant(nonce)`: validates 32-hex nonce, delegates to `repo.tryRevoke(nonce, Date.now())`.
- `grants.controller.ts`:
  - `POST /policy/grants/:nonce/revoke` → 200 `{ ok: true, revokedAtMs }` (including idempotent re-revoke); 404 NotFound (unknown_nonce); 409 Conflict (already_used); 400 BadRequest (invalid nonce).
  - `POST /policy/grants/:nonce/consume` now maps `"already_revoked"` → `ConflictException` (409).
  - Uses `ConflictException`/`NotFoundException`/`BadRequestException` from `@nestjs/common`.

### Tests (`grants.test.ts`, 7 new tests → 74 total)

- `revoke succeeds on active grant` + idempotent re-revoke returns same timestamp.
- `revoke on consumed grant fails with already_used`.
- `consume on revoked grant fails with already_revoked`.
- `verify denies revoked grant before expiry check` (revoked-before-expiry precedence).
- `revoke with malformed nonce throws validation error`.
- `concurrent revoke calls on same nonce are idempotent (both succeed with same timestamp)` via `RaceTestRepository` with yield/re-check pattern.
- `concurrent consume vs revoke on same nonce: exactly one succeeds` (depends on which writes first; outcome is either consume succeeds + revoke fails "already_used", or revoke succeeds + consume fails "already_revoked").
- `RaceTestRepository` extended with `tryRevoke` implementing yield/re-check pattern.

### Layout records

No changes (no new files, no migration, 105/74/37 unchanged).

## Verification

- Contracts `npm test`: 55 pass, 0 fail.
- Policy service `npm test`: 74 pass, 0 fail (compiles through `nest build`, runs without DB).
- `python3 nova/tests/layout/check_layout.py`: all checks passed.

## Notes

- Design note updated with revoked-before-expiry precedence, mutually exclusive terminal states, and idempotent revocation.
- Two pre-existing `test_layout_checks.py` failures at HEAD are unrelated and unchanged.