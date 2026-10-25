# 2026-10-25 — Module 08 task 13 — policy version pinning

## Scope

Add policy version to every decision and pin it in the grant (Module 08 task 13, plan `docs/plan/08-policy-approval.md` task 13). Acceptance: "A policy change invalidates old grants". Spec test: `test_policy_change_invalidates_grant` — a version bump invalidates old grants.

## Implementation

### Policy version module (`policy-version.ts`)

New module `src/policy/policy-version.ts` manages the global policy version:
- `getPolicyVersion()` — returns current version (default 1, configurable via `POLICY_VERSION` env)
- `setPolicyVersion(version)` — sets version (validates positive integer)
- `bumpPolicyVersion()` — increments version, returns new version
- `getPolicyVersionConfig()` — returns `{ currentVersion }`
- `resetPolicyVersion()` — test helper

### Policy decision service

- `PolicyDecisionService` now uses `getPolicyVersion()` for all decisions
- Every decision response includes `policyVersion` from the global version

### Policy controller endpoints

- `GET /policy/version` — returns `{ currentVersion: number }`
- `POST /policy/version/bump` — increments version, returns new version
- Bumping the version invalidates all existing grants

### Grant creation

- `createGrant` and `createGrantWithDetails` pin `getPolicyVersion()` in the grant's `policyVersion` field
- Grants store the version at creation time

### Verification

- `verifyBinding` already compared attempt's `policyVersion` with grant's stored version
- Mismatch returns `policy_version_mismatch`
- Version bump immediately invalidates ALL existing grants

### Tests (12 new tests, 90 total)

- Version module: get/set/bump/reset, validation
- Decision service uses current version, reflects bumps
- Grant pins current version at creation
- `verifyBinding` rejects old-version grants after bump
- `verifyBinding` accepts grants with current version
- Controller endpoints: get version, bump version

### Design note updated

Added "Policy version pinning (Task 13)" section to `docs/design-notes/nova-approval-grants.md` documenting version bumping, grant invalidation, endpoints, and test coverage.

## Verification

- Policy service `npm test`: 90 pass (12 new tests)
- Contracts `npm test`: 75 pass
- Layout: 107/74/37 passed
- All files under 200 lines, header comments, ASD-STE100 language

## Notes

- In-memory version state; production would persist to DB
- Rule versions in `families.yaml` track individual rule changes
- Global policy version tracks overall policy configuration
- Any policy change should bump the version
- The acceptance test `test_policy_change_invalidates_grant` is now implemented