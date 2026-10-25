# 2026-10-25 — Module 08 task 10 — chat-approval policy

## Scope

Implement the chat-approval policy: low-risk allow-list, payload binding, expiry and nonce checks (Module 08 task 10, plan `docs/plan/08-policy-approval.md` task 10). Acceptance: "A high-risk payload is refused by the policy service with no channel involved".

## Implementation

### Schema changes (`policy-schema.ts`)

- Added optional `chatApprovalAllowed?: boolean` field to `PolicyRule` interface
- Added `chatApprovalAllowed` to `allowedKeys` for validation
- Added `chatApprovalAllowed?: boolean` and `chatApprovalReason?: string` to `PolicyDecisionResponse`

### Decision logic (`policy-decision.service.ts`)

- `evaluateChatApproval(rule)` helper evaluates chat-approval eligibility:
  - High-risk rules (tier3/tier4): `allowed: false, reason: "chat_approval_not_allowed"`
  - Rules with `chatApprovalAllowed: true`: `allowed: true, reason: "Chat approval allowed by policy rule"`
  - Others: `allowed: false, reason: "chat_approval_requires_standard_flow"`
- Chat-approval metadata added to decision response without changing the `decision` field
- Standard approval flow (`needs_approval` with `payloadHash`, `nonce`, `expirySeconds`, `requiresStepUp`) preserved

### Families updated (`families.yaml`)

Added `chatApprovalAllowed: true` to 7 low-risk read actions:
- `inbox.read`, `calendar.read`, `tasks.read`, `tasks.write`, `finance.read`, `trips.read`, `jobs.search`

### Tests (2 new files, all under 200 lines)

- `policy-decision.service.test.ts` (198 lines) — core decisions, matrix rows
- `policy-decision.service.chat-approval.test.ts` (82 lines) — Task 10 acceptance:
  - High-risk (tier3/tier4) returns `chat_approval_not_allowed`
  - Low-risk with `chatApprovalAllowed=true` returns `chatApprovalAllowed=true`
  - Medium-risk without explicit flag returns `chat_approval_requires_standard_flow`
  - Requests without `payloadHash` have undefined chat fields

## Verification

- Policy service `npm test`: 76 pass (new suite: "chat-approval policy (Task 10)")
- Contracts `npm test`: 66 pass
- `python3 nova/tests/layout/check_layout.py`: all checks passed (105/74/37)
- All files under 200 lines, header comments, ASD-STE100 language

## Notes

- Decision field is NOT changed by chat-approval policy — only metadata added
- High-risk rules are refused at policy boundary with `chat_approval_not_allowed` reason
- Standard grant binding (payload hash, nonce, expiry) still required for chat-approved actions
- The `chatApprovalAllowed` flag means "eligible for chat approval", not "auto-approve"