# Change — 2026-11-09-p5-m21-t13-mcp-security-suite

## Problem

Task 21.13 (module 21, P5): write the MCP security suite — forged JWT, wrong audience, missing scope, viewer write, missing grant, tool shadowing, replay, oversize. Artifact: `services/contracts/mcp/`. Acceptance: every case is denied.

## Changes (test-first)

- Wrote `nova/packages/contracts/mcp/security.test.ts` with 8 test cases covering all MCP security rejection paths. Test-first confirmed: tests failed before implementation existed (missing enforcement for 3 of 8 cases).

- Implemented 3 missing enforcement mechanisms in `nova/packages/contracts/mcp/server/registry.ts`:
  1. Role-based authorization in `validate_and_authorize_call` — checks `caller.roles` against `tool.allowed_roles`; viewer calling write tool returns `forbidden`
  2. Replay guard — tracks `call_id` in a module-level `Set`; duplicate call IDs return `replay_detected`
  3. Size guard — rejects calls larger than 1MB with `quota_exceeded`

- Added `roles` field to `ServiceClaims` in `nova/packages/contracts/service-token.ts` and updated `issueToken` and `readClaims` to handle it.

- Added `approval_grant` to `KNOWN_MCP_CALL_FIELDS` in `nova/packages/contracts/mcp/call-validate.ts` — required for MCP calls that include an approval grant.

- Added `mcp/security.test.ts` to `tsconfig.json` `include` and `dist/mcp/security.test.js` to `package.json` test script.

## Verification

- `npm test` in `nova/packages/contracts` → 202 tests pass, 0 fail (5 suites, including 8 new MCP security tests)
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB)
- `python3 nova/tests/layout/test_layout_checks.py` → every mutation rejected

## Notes

Task 21.13 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 21 now 14 done / 0 partial / 1 open; P5 now 50 done / 2 partial / 2 open (92%); totals 232 done / 17 partial / 154 open (57%).

Remaining P5 module 21 tasks: 21.14 (lab 13). Then module 03 task 16 (cancellation) and module 04 task 17 (red-team CI).

No commit made (commit decision belongs to the owner).
