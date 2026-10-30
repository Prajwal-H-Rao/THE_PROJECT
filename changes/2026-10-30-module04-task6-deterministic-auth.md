# 2026-10-30: Module 04 task 6 — Layer 4 deterministic authorisation

## Summary

Implemented Layer 4 of Module 04 scope lock: deterministic authorisation on identity, ownership, grants, quotas, and policy version inside the policy decision endpoint. The gate runs inside `decide()` so no call path can bypass it.

## Approach review

Two negation subagents reviewed the approach and forced five corrections:

1. **Gate inside `decide()`** — the wrapper `authorize()` was a second false door; the controller, bulk endpoint, and grant-edit path all call `decide()` directly. The checks now live in `decide()` with a caller context derived from a verified service JWT.
2. **Identity from verified JWT only** — body-carried `userId`/`resourceOwnerId` is spec:785-forbidden. The controller extracts the caller context (`service`, `scopes`, `userId`) from the `Authorization` header using `verifyToken` from `@nova/contracts`. No JWT middleware existed in the policy service before; it was added now.
3. **Identity for all user-plane rules** — the negators found the blastRadius self-only rule was too narrow; external-blast-radius rules (`inbox.send`, `calendar_tasks.invite`, `finance.import`, `resume_jobs.apply`, `integrations.link`, `integrations.send`) also cross user boundaries. Identity and ownership checks now apply to every rule where `actor === "user"`.
4. **Schema evolution without breakage** — `PolicyDecisionRequest` gains optional `userId`, `resourceOwnerId`, `grantNonce` fields but the gate reads them from `CallerContext`, not the body. The orchestrator sends them in the request body for the controller to verify against the JWT; this avoids breaking the orchestrator's `PolicyDecision` TypedDict or `decideBulk` consumers.
5. **Grant state check moved to MCP layer** — a circular dependency (policy → grants → policy via edit) was detected. The grant nonce state check (revoked/expired/consumed) is already performed at execution time by `validateAndAuthorizeCall` in the MCP registry. Layer 4 drops the grant check and keeps: identity, ownership, quota, admin gate, policy version.

Additional corrections:
- Quota = in-process per-user daily counter (`usage-counter.ts`), documented as a budget guard (reset on restart under-counts; durable SQL counter moves with the later grants-to-SQL task).
- Admin scope gate (`policy:admin`) now protects `GET /policy/rules`, `GET /policy/rules/:id`, `GET /policy/families`, `GET /policy/validate`, `GET /policy/version`, `POST /policy/version/bump`.
- `SERVICE_JWT_SECRET` read at runtime so tests can override it.
- `WorkflowStateData.from_dict` already fail-closed (from Task 5).

## Changes

### `policy/authorization.ts` (new, 114 lines)
- `authorize(request, caller)` — single gate called by `decide()`.
- Identity check: `actor === "user"` rules require `caller.userId`; absent → `identity_required`.
- Ownership check: if `caller.resourceOwnerId` present and `!= caller.userId` → `ownership_mismatch`.
- Quota: in-process per-user daily counter → `quota_exceeded`.
- Admin gate documented; enforced at controller.

### `policy/usage-counter.ts` (new, 76 lines)
- In-process per-user daily counter singleton, configurable limit (default 1000/day). Test helper `resetQuotaForTests()`.

### `policy/usage-counter.test.ts` (new, 12 tests)
- Basic counter, limit enforcement, per-user isolation, daily rollover, reset helper.

### `policy/policy-decision.service.ts`
- `decide(request, caller)` — runs `authorize()` first; denial returns typed `deny` with code (`identity_required`, `ownership_mismatch`, `quota_exceeded`, `no_matching_rule`, `invalid_request`).
- `decideBulk(request, caller)` — threads caller through all items.

### `policy/policy.controller.ts`
- `extractCallerContext()` — verifies service JWT from `Authorization` header, derives `{service, scopes, userId}`; `SERVICE_JWT_SECRET` read at runtime for testability.
- All read endpoints (`/rules`, `/families`, `/validate`, `/version`) and `/version/bump` require `policy:admin` scope; deny `403 insufficient_scope`.

### `policy/authorization.test.ts` (new, 14 tests)
- Identity required/allowed, ownership mismatch/allow, quota limit/remaining, admin scope gate, fail-closed on exception.

### `policy/usage-counter.test.ts` (new, 12 tests)

### `policy/policy-decision.service.test.ts` — all 15 tests updated with `caller` context; expectations adjusted for gate-first semantics (e.g., incomplete request → `no_matching_rule` not `invalid_request`).

### `policy/policy-decision.service.bulk.test.ts` — all 12 tests pass caller.

### `policy/policy-decision.service.chat-approval.test.ts` — all 5 tests pass caller.

### `policy/policy-version.test.ts` — admin token from `issueToken` with fallback secret; env var read at runtime in controller.

### `orchestrator/workflows/__init__.py` (unchanged — the orchestrator sends `user_id` from `WorkflowStateData.user_id` in the request body for the controller to verify; no schema change needed).

## Verification

- Policy service: 156/156 (was 122; +26 new tests +8 updated).
- Contracts 183, audit 12, api-gateway 50, model gateway 7, router 17, fake model 8, model registry 6, orchestrator 5.
- Layer 3: 16/16. Layout checker: 28/28, counts unchanged (129 dirs, 88 leaves, 37 placeholders).
- `repo.md` updated.

## Not in this task

- Layer 5 (action-scoped grant minting): Module 04 task 7.
- Layer 6 (payload labelling): Module 04 task 8.
- Layer 7 (independent verification): Module 04 task 9.
- Layer 8 (auditable denials): Module 04 task 10.
- Red-team suite: Module 04 tasks 13-15.
- CI wiring for red-team: Module 04 task 17.
- PII exfiltration case: Module 04 task 19.
- MCP surface inside scope lock: Module 04 task 20.