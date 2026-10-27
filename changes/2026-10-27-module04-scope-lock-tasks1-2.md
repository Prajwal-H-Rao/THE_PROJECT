# 2026-10-27: Module 04 — Scope Lock (Tasks 1-2)

## Summary
Implemented Tasks 1-2 of Module 04 (Scope Lock and Anti-Jailbreak):
- Task 1: Added deny-list guard and fail-closed loader to policy-approval-service
- Task 2: Wrote deny-list as a tested guard

## Changes

### Policy Approval Service
- Created `src/policy/deny-list.ts` with 23 denied operations from spec §212
- Added `checkDenied()`, `checkToolNameDenied()`, `checkArgumentsForDenied()` functions
- Updated `policy-loader.ts`:
  - Added `CANONICAL_FAMILIES` constant with 7 spec families
  - Fail-closed loading: unknown family names, missing files, deny-list violations cause immediate startup failure
  - Deny-list guard validates all rules and allowedActions against deny-list
  - Verifies all 7 canonical families are present
- Added comprehensive tests in `policy-loader.test.ts`:
  - Deny-list contains all 23 spec §212 operations
  - Exact denied operation names caught
  - Compound tool names matching denied patterns (e.g., "shell.execution" → "shell_execution")
  - Allowed tool names return undefined
  - Arguments with denied operations caught (including nested)
  - Clean arguments return undefined

### Tests
- Policy-approval-service: 130 tests pass
- All other test suites pass (contracts, audit-service, api-gateway, model-gateway, router, fake-model, model-registry, orchestrator)
- Layout checker: 28/28 checks pass

## Files Added/Modified
- `nova/services/policy-approval-service/src/policy/deny-list.ts` (new)
- `nova/services/policy-approval-service/src/policy/policy-loader.ts` (modified)
- `nova/services/policy-approval-service/src/policy/policy-loader.test.ts` (modified)

## Next Steps
- Task 3: Layer 1 ingress contract in api-gateway
- Task 4: Layer 2 scope clarification on router
- Task 5: Layer 3 constrained planning
- Task 6-12: Layers 4-10
- Task 13-20: Red-team suite and CI integration