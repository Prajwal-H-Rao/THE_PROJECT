# 2026-10-30: Module 04 task 7 — Layer 5 action-scoped grant

## Summary

Implemented Layer 5 of Module 04 scope lock: mint an action-scoped grant bound to service, operation, user, target, and payload hash. The grant cannot be reused and is bound to a specific MCP catalogue operation.

## Approach review

Two negation subagents reviewed the approach and forced corrections for 10 blockers:

1. **Grant action must match catalogue operation_id exactly** — grants used short action names ("send") but the catalogue uses full operation_ids ("inbox.send"). Fixed by using full operation_ids everywhere.
2. **`loadCatalogue` must handle missing directory gracefully** — added ENOENT handling.
3. **TypeScript `VerifyGrantOptions` needs `action` field** — added to both interface and client.
4. **MCP server `verifyGrant` call fixed** — now uses `GrantVerificationClient` with proper `action` and `payload` parameters.
5. **`verifyBinding` check order** — `action_mismatch` checked with service/target binding, after payloadHash.
6. **`action_mismatch` added to deny reason types** — in both `GrantDenyReason` and `GrantVerifyResult`.
7. **Orchestrator sends full operation_id** — `agent_workflow.py` now sends `step.tool` (full operation_id) as `action` in policy requests.
8. **Python client parity** — confirmed TypeScript-only is acceptable; orchestrator calls policy service via HTTP directly.
9. **Catalogue validation at grant creation** — added validation against loaded MCP catalogue; `grant-validation.ts` validates action against loaded catalogue.
10. **Validation deduplication** — extracted shared validation to `grant-validation.ts` module (keeps files <200 lines).

## Changes

### Contracts package (`packages/contracts/`)
- **`mcp/server/registry.ts`** — `loadCatalogue` returns `Promise<ToolCatalogue>`, handles ENOENT; `validateAndAuthorizeCall` is async, uses `GrantVerificationClient` with `action: tool.name` and `payload: mcpCall.arguments`; MCPCall interface gains `approval_grant?` field.
- **`mcp/call.ts`** — `MCPCall` interface gains `approval_grant?` field.
- **`grant-verification-types.ts`** — `VerifyGrantOptions` gains `action: string`; `GrantVerifyResult` gains `action_mismatch` reason.
- **`grant-verification.ts`** — `GrantVerificationClient.verifyGrant` sends `action` in request body; exports `VerifyGrantOptions`.
- **Catalogue JSONs** — all 7 family files now have `version: 1` on each operation.
- **`package.json`** — build script copies `mcp/catalogue` to `dist/mcp/`.

### Policy Approval Service (`services/policy-approval-service/`)
- **`approval/grant-binding.ts`** — `GrantVerifyAttempt` gains `action`; `GrantDenyReason` adds `action_mismatch`; `verifyBinding` checks action match after service/target.
- **`approval/grant-validation.ts` (new)** — `validateCreateGrantInput` validates action against provided catalogue; throws `invalid_action` if action not in catalogue.
- **`approval/grant-creation.ts`** — `createGrant`/`createGrantWithDetails` are async; load catalogue via `loadCatalogue`; validate action against catalogue; use shared `validateCreateGrantInput` and `createBaseGrantRecord` from `grant-validation.ts`.
- **`approval/grant-validation.ts` (new)** — shared validation logic extracted from `grant-creation.ts`; validates action against catalogue.
- **`approval/grants.service.ts`** — `createGrant`/`createGrantWithDetails` are async; use new async creation functions.
- **`approval/grants.controller.ts`** — endpoints are async; return `Promise<GrantRecord>`.
- **`approval/grants.test.ts`** — all tests updated to async; `grantWithDetailsInput` uses `action: "inbox.send"`; new async tests for preview size limit.
- **`policy/policy-version.test.ts`** — `createGrantInput` uses `action: "inbox.send"`.

### Other
- **`orchestrator/workflows/agent_workflow.py`** — `decide_node` sends `action: step.tool` (full operation_id) instead of split short form.
- **`services/policy-approval-service/src/policy/policy-version.test.ts`** — `createGrantInput` uses `action: "inbox.send"`.

## Verification

- All 156 policy service tests pass (was 122).
- Contracts 183, audit 12, api-gateway 50, model gateway 7, router 17, layer 3 (16), orchestrator 5, fake model 8, model registry 6.
- Layout checker: 28/28, counts unchanged (129 dirs, 88 leaves, 37 placeholders).
- `repo.md` updated. Changelog: `changes/2026-10-30-module04-task7-action-scoped-grant.md`.

## Not in this task

- Layer 6 (payload labelling): Module 04 task 8.
- Layer 7 (independent verification): Module 04 task 9.
- Layer 8 (auditable denials): Module 04 task 10.
- Red-team suite: Module 04 tasks 13-15.
- CI wiring for red-team: Module 04 task 17.
- PII exfiltration case: Module 04 task 19.
- MCP surface inside scope lock: Module 04 task 20.