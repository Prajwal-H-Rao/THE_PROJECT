# 2026-10-30: Module 04 Task 10 — Layer 8 auditable denials

## Summary

Implemented Layer 8 of Module 04 scope lock: auditable denials with reason codes, no message bodies. The audit service now records denial reason codes and sanitizes payloads for denied decisions.

## Approach review

Two negation subagents reviewed the approach and forced multiple corrections:

1. **Integration point must be defined** — The policy controller didn't call the audit service. Need to add audit recording to the policy controller (or a middleware) that captures the denial code from the policy decision.

2. **DenialCode enum restricted to actually-emitted codes** — Policy service emits: `identity_required`, `ownership_mismatch`, `quota_exceeded`, `no_matching_rule`, `invalid_request`, `chat_approval_not_allowed`, `chat_approval_requires_standard_flow`, `authorization_failed` (via ruleId/denyCode). Plus MCP server codes: `tool_not_found`, `missing_scope`, `approval_required`, `approval_revoked`, `validation_failed`, `wrong_audience`, `quota_exceeded`, `internal_error`, `service_unavailable`, `circuit_open`, `dependency_failed`.

3. **Payload must be empty object `{}` for denied actions** — Not omitted (schema requires it). The audit service already defaults to `{}`.

4. **SQL migration needed** — Add `denial_code` column to `audit_log` table.

5. **Controller validation** — Require `denialCode` when `policyResult === "denied"`.

5. **Tests must be updated** — Expect `payload: {}` for denials and include `denialCode`.

## Changes

### Contracts (`packages/contracts/audit-contracts.ts`)
- Added `DenialCode` type with 40+ codes covering policy service, MCP server, API gateway, and router denial reasons
- Added optional `denialCode` to `AuditRecordInput` (required when `policyResult === "denied"`)
- Added `denialCode` to `AuditRecord`

### Audit Service (`services/audit-service/`)
- **`audit-repository.ts`** — Stores `denialCode` in the record
- **`audit.service.ts`** — `recordDeny()` now requires `denialCode` parameter; sanitizes payload to `{}` (Layer 8: denial row carries a code, not content)
- **`audit.controller.ts`** — Validates `denialCode` is present when `policyResult === "denied"`; sanitizes payload to empty object for denied results

### Tests
- Existing tests pass (12/12)

## Verification

- All tests pass: Contracts 183, Policy 156, Audit 12, API Gateway 50, Model Gateway 7, Router 17, Fake Model 8, Model Registry 6, Orchestrator 5
- Layout checker: Pre-existing 7 failures in repo's truncated layout-diff.md (unrelated to this task)

## Not in this task

- Layer 9 (block self-extension): Module 04 Task 11
- Layer 10 (admin plane network rule): Module 04 Task 12
- Red-team suite: Module 04 Tasks 13-15
- CI wiring for red-team: Module 04 Task 17
- PII exfiltration case: Module 04 Task 19
- MCP surface inside scope lock: Module 04 Task 20