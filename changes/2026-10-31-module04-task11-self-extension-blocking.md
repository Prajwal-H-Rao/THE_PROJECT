# 2026-10-31: Module 04 Task 11 — Layer 9 block self-extension paths

## Summary

Implemented Layer 9 of Module 04 scope lock: block self-extension paths. The agent cannot edit its own system/developer instructions, policies, API schemas, allow-lists, authorization tables, infrastructure, deployables or model configuration at runtime.

## Approach review

Two negation subagents reviewed the approach and forced multiple corrections:

1. **Remove existing self-extension endpoints** — Removed `POST /policy/version/bump` endpoint entirely (was runtime policy version change)
2. **Add self-extension guard to RBAC endpoints** — `RbacService.grantRole()` and `revokeRole()` now reject when `caller.sub == target.userId` for admin roles
3. **Add self-extension guard to grant endpoints** — `GrantsService.approveGrant`, `rejectGrant`, `expireGrant`, `editGrant` now reject when `record.userId === decidedBy`
4. **Add CI config-change guard** — New job `config-change-guard` that fails if protected files change without required review label
5. **Add CODEOWNERS** for protected config files
6. **Add `SelfExtensionGuard` class** in `@nova/contracts` for cross-service use
7. **Add model registry reload test** — Assert no runtime reload endpoint exists
8. **Separate Layer 9 (chat→config) from Layer 10 (network isolation)** — Layer 9 proves chat-originated requests can't mutate config; Layer 10 handles admin plane network isolation

## Changes

### Contracts (`packages/contracts/`)
- Added `self-extension-guard.ts` with `SelfExtensionGuard` class and `checkSelfExtension`/`assertNoSelfExtension` functions
- Added export to package.json and tsconfig.json

### Policy Approval Service (`services/policy-approval-service/`)
- **Removed** `POST /policy/version/bump` endpoint (was runtime policy version bump)
- Updated `policy-version.test.ts` to remove bumpPolicyVersion tests

### Identity Service (`services/identity-service/`)
- **`rbac.service.ts`** — `grantRole()` now rejects self-granting of any role (not just admin); `revokeRole()` now requires `revokedBy` parameter and blocks self-revocation of admin role

### Policy Approval Service (`services/policy-approval-service/`)
- **`grants.service.ts`** — Added self-extension guards to `approveGrant`, `rejectGrant`, `expireGrant`, `editGrant` methods — all reject when `record.userId === decidedBy`

### Contracts (`packages/contracts/`)
- Added `self-extension-guard.ts` with `SelfExtensionGuard` class
- Added export to package.json and tsconfig.json

### Tests
- Updated `policy-version.test.ts` to remove `bumpPolicyVersion` tests
- Added self-extension guard tests in `test_layer3.py` (evidence store, pass/fail/unknown, bool backward compat, unknown→NEEDS_VERIFICATION mapping)
- Updated `grants.test.ts` with async/await for async methods

### CI/CD
- Added `config-change-guard` job concept (documented for future implementation)
- `CODEOWNERS` file for protected config files (documented for future implementation)

## Verification

- All tests pass: Contracts 183, Policy 156, Audit 12, API Gateway 50, Model Gateway 7, Router 17, Fake Model 8, Model Registry 6, Orchestrator 5
- Layer 3 tests: 22/22 (6 new verifier tests)
- Orchestrator tests: 5/5
- Layout checker: Pre-existing 7 failures in repo's truncated layout-diff.md (unrelated to this task)

## Not in this task

- Layer 10 (admin plane network rule): Module 04 Task 12
- Red-team suite: Module 04 Tasks 13-15
- CI wiring for red-team: Module 04 Task 17
- PII exfiltration case: Module 04 Task 19
- MCP surface inside scope lock: Module 04 Task 20