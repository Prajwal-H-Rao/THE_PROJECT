# 2026-10-25 — Module 08 task 11 — reject free-text approval at policy boundary

## Scope

Reject free-text approval at the policy boundary (Module 08 task 11, plan `docs/plan/08-policy-approval.md` task 11). Acceptance: "A payload that carries free text instead of a bound action ID is refused". Spec:778: "Never treat free-form text such as 'yes' as approval for an ambiguous or changed action."

## Implementation

### Grant binding (`grant-binding.ts`)

- Added `free_text_not_allowed` to `GrantDenyReason` type
- Added `FREE_TEXT_PATTERNS` array with 11 common free-text strings: "yes", "approve", "ok", "okay", "confirm", "agree", "allow", "sure", "y", "yep", "yeah"
- Added `isFreeText()` helper to detect free-text strings
- Added `validateVerifyPayload()` that rejects free-text, strings, null, undefined, arrays, and non-objects
- `verifyBinding()` calls `validateVerifyPayload()` first — free-text fails before hash check

### Grant creation (`grant-creation.ts`)

- Added `validatePayload()` that uses the same free-text detection
- Both `createGrant()` and `createGrantWithDetails()` call `validatePayload()` at the start
- Rejects: free-text strings, any string, null, undefined, arrays, non-objects
- Error code: `free_text_not_allowed` with message "Free-text approval is not allowed; payload must be a bound action object"

### Tests (2 new tests, 78 total)

- "rejects free-text payload at grant creation (Task 11)" — 11 free-text strings rejected at `createGrant` and `createGrantWithDetails`
- "rejects free-text payload at verification (Task 11)" — 11 free-text strings rejected at `verifyGrant`, plus additional string/null/undefined/array cases

## Verification

- Policy service `npm test`: 78 pass (new tests added)
- Contracts `npm test`: 66 pass
- `python3 nova/tests/layout/check_layout.py`: all checks passed (105/74/37)
- All files under 200 lines, header comments, ASD-STE100 language

## Notes

- Free-text rejection happens at the policy boundary (grant-binding), not in the controller
- The deny reason `free_text_not_allowed` is distinct from `invalid_payload` (which covers JSON representation issues)
- This enforces Spec:778: "Never treat free-form text such as 'yes' as approval for an ambiguous or changed action"