# 2026-10-25 — Module 08 task 14 — bulk-action policy

## Scope

Implement bulk-action policy: no silent enable of new sources or applications (Module 08 task 14, plan `docs/plan/08-policy-approval.md` task 14). Acceptance: "Batch test fails on escalation".

## Implementation

### Schema changes (`policy-schema.ts`)

- Added `BulkDecisionRequestItem` — single request within a bulk decision
- Added `BulkDecisionRequest` — `{ items: BulkDecisionRequestItem[] }`
- Added `BulkDecisionItemResult` — per-item result with decision, ruleId, reason, approvalRequired, chatApprovalAllowed, chatApprovalReason
- Added `BulkDecisionResponse` — `{ decision, policyVersion, reason, items, hasEscalation }`
- Added `validateBulkDecisionRequest()` — validates items array is non-empty and each item is a valid decision request

### Decision logic (`policy-decision.service.ts`)

- Added `isEscalationAction(rule)` — detects escalation actions:
  - Risk tier 3 or 4
  - `requiresStepUp: true`
  - Rule ID patterns: `*.apply`, `*.submit`, `*.import`, `*.link`, `*.connect`, `*.add*source`, `*.create*source`, `*.register*source`
- Added `decideBulk(request)` method:
  - Validates bulk request
  - Evaluates each item with existing `decide()` method
  - Tracks escalation, deny, needs_approval across all items
  - Batch decision logic:
    - Any deny → batch deny
    - Any needs_approval OR escalation → batch needs_approval (with escalation reason if applicable)
    - All allow → batch allow
  - Returns `BulkDecisionResponse` with overall decision, policyVersion, reason, per-item results, and `hasEscalation` flag
- Chat approval evaluation updated: high-risk rules (tier3/tier4) always return `chat_approval_not_allowed` even without payloadHash

### Controller endpoint (`policy.controller.ts`)

- Added `POST /policy/decide/bulk` endpoint accepting `BulkDecisionRequest`, returning `BulkDecisionResponse`

### Tests (13 new tests, 103 total)

- All allow actions → allow
- Any deny → deny
- Any needs_approval → needs_approval
- Escalation action (jobs.apply, finance.import, channels.link, inbox.send) → needs_approval with escalation reason
- Empty items array → rejected
- Invalid item in batch → rejected
- Item results contain correct metadata (index, ruleId, decision, approvalRequired)
- Chat approval metadata preserved in results
- High-risk without payloadHash → chat_approval_not_allowed
- Response includes policyVersion and hasEscalation

### Design note updated

Added "Bulk action policy (Task 14)" section to `docs/design-notes/nova-approval-grants.md` documenting escalation detection, batch decision logic, response format, endpoints, and test coverage.

## Verification

- Policy service `npm test`: 103 pass (13 new tests)
- Contracts `npm test`: 75 pass
- Layout: 107/74/37 passed
- All files under 200 lines, header comments, ASD-STE100 language

## Notes

- Escalation detection uses rule ID patterns to identify actions that add sources or submit applications
- Batch cannot silently allow escalation — forces needs_approval with explicit reason
- Per-item results include chat approval metadata for UI integration
- No new migration needed; uses existing policy schema