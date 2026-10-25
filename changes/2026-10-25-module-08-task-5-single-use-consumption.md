# 2026-10-25 — Module 08 task 5 — single-use grant consumption with race test

## Scope

Single-use consumption of approval grants (Module 08 task 5, plan `docs/plan/08-policy-approval.md` task 5). Spec:778 — the approval is bound to nonce and must be single-use.

## Decision (design note: `docs/design-notes/nova-approval-grants.md`)

- Consumption state lives in `consumed_at` (migration 24). The conditional update
  `UPDATE ... SET consumed_at = now() WHERE nonce = $1 AND consumed_at IS NULL`
  is the authoritative atomic operation for the SQL adapter.
- `verifyBinding` validates **binding validity only** (payload hash, identity,
  expiry, revocation, policy version). It does **not** check consumption status.
  A consumed grant's binding remains mathematically valid; callers must use
  `consumeGrant` to enforce single-use. This separation keeps binding logic pure
  and consumption a separate lifecycle concern.
- The in-memory repository emulates the conditional update with a synchronous
  check-and-set in one event-loop tick (atomic in Node.js). A test-only
  `RaceTestRepository` injects a yield between check and mutation to simulate
  the async race window and prove exactly one concurrent consume succeeds.

## Implementation

### Service (`nova/services/policy-approval-service/src/approval/`)

- `grants.service.ts`:
  - `GrantRepository` interface gains required `async tryConsume(nonce, nowMs): Promise<ConsumeVerdict>`.
  - `InMemoryGrantRepository.tryConsume`: finds record, checks `consumedAtMs === null`, creates **new** `GrantRecord` with updated `consumedAtMs` (preserving immutability), saves, returns `{ ok: true, consumedAtMs }` or `{ ok: false, reason }`. Treats `null` as unconsumed.
  - `ConsumeVerdict` type: `{ ok: true, consumedAtMs } | { ok: false, reason: "already_used" | "unknown_nonce" }`.
  - `GrantsService.consumeGrant(nonce)`: validates nonce is 32-char hex, then delegates to `repo.tryConsume(nonce, Date.now())`.
- `grants.controller.ts`: `POST /policy/grants/:nonce/consume` → on success 200 `{ ok: true, consumedAtMs }`; on `already_used` throws `ConflictException` (409); on `unknown_nonce` throws `NotFoundException` (404). Uses `ConflictException`/`NotFoundException` from `@nestjs/common` for consistency with existing `BadRequestException` pattern.

### Tests (`grants.test.ts`, 4 new tests → 67 total)

- `consume is single-use`: concurrent `consumeGrant` calls on same nonce via `RaceTestRepository` → exactly one `ok:true`, the other `already_used`.
- `verifyBinding returns ok on consumed grant`: confirms binding validity and consumption are separate.
- `consume with malformed nonce throws validation error`: 32-hex format enforced at service layer.
- Race test uses standalone `RaceTestRepository` implementing full `GrantRepository` interface with deliberate `await Promise.resolve()` between check and mutation to force the interleaving window.

### Layout records

No changes (no new files, no migration, 105/74/37 unchanged).

## Verification

- Contracts `npm test`: 55 pass, 0 fail.
- Policy service `npm test`: 67 pass, 0 fail (compiles through `nest build`, runs without DB).
- `python3 nova/tests/layout/check_layout.py`: all checks passed.

## Notes

- Design note updated with single-use consumption semantics and `verifyBinding` behavior.
- Two pre-existing `test_layout_checks.py` failures at HEAD are unrelated and unchanged.