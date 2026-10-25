# 2026-10-25 — Module 08 task 9 — approve/reject/edit/expire grant outcomes

## Scope

Support approve, reject, edit and expire outcomes for approval grants (Module 08 task 9, plan `docs/plan/08-policy-approval.md` task 9). Acceptance: "Edit re-hashes and re-routes to policy".

## Implementation

### New endpoints in `grants.controller.ts`

- `POST /policy/grants/:nonce/approve` — sets status to approved, returns `StatusVerdict`
- `POST /policy/grants/:nonce/reject` — revokes grant and sets status to denied, returns `StatusVerdict`
- `POST /policy/grants/:nonce/expire` — revokes grant and sets status to expired, returns `StatusVerdict`
- `POST /policy/grants/:nonce/edit` — re-hashes payload and card, re-routes to policy decision service:
  - `deny` → HTTP 403 `policy_denied`, grant unchanged
  - `needs_approval` → returns to pending with new hashes, fresh approval required
  - `allow` → approves grant and marks approved

### Service split (all files under 200 lines)

- `grant-repository.ts` (137 lines) — `InMemoryGrantRepository` with `tryConsume`, `tryRevoke`, `updateStatus`, `editGrant`
- `grant-repository-types.ts` (65 lines) — `GrantRepository` interface, `ConsumeVerdict`, `RevokeVerdict`, `StatusVerdict`, `EditVerdict`, `EditGrantInput`
- `grant-card.ts` (94 lines) — consequence map, permissions helper, preview validation, `formatGrantCard`
- `grant-creation.ts` (135 lines) — `createGrant`, `createGrantWithDetails` (Tasks 4 and 8)
- `grant-outcomes.ts` (149 lines) — `handleApproveGrant`, `handleRejectGrant`, `handleExpireGrant`, `handleEditGrant`
- `grants.service.ts` (147 lines) — thin facade delegating to the above

### Tests

- 4 new tests for approve/reject/expire outcomes
- 4 tests for edit re-hash and re-route (allow, deny, needs_approval)
- 1 test for edit card hash change on preview edit
- 2 tests for refusals on consumed/revoked/decided grants
- All 81 tests pass (policy service), 66 pass (contracts)

### Layout records

- Added policy-approval-service files to `record_paths.py` group 15 (sixteenth path group)
- Updated `layout-diff.md` sixteenth group sentence
- Layout checker passes (105/74/37)

## Verification

- Policy service `npm test`: 81 pass
- Contracts `npm test`: 66 pass
- `python3 nova/tests/layout/check_layout.py`: all checks passed

## Notes

- No new migration: approvals table already has `status`, `decided_at`, `decided_by` from migration 04
- Edit follows policy decision: deny refuses and leaves grant unchanged; allow accepts and approves; needs_approval accepts but returns to pending
- Reject and expire both revoke the grant (set `revokedAtMs`) then set status
- Terminal grants (consumed, revoked, decided) cannot be edited — returns `already_terminal`