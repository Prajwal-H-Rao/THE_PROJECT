# Change — 2026-11-09-p6-m09-t12-calendar-attendee-approval

## Problem

Task 09.12 (module 09, P6): add attendee-aware approval for invite events. Artifact: `services/calendar-service/src/mcp/server.test.ts`. Acceptance: invite events with attendees require approval grant.

## Changes

- Extended `nova/services/calendar-service/src/mcp/server.test.ts` with two new test cases:
  - `test_mcp_invite_rejects_without_approval_grant` — verifies that calling `calendar_tasks.invite` without an `approval_grant` is rejected with `approval_required` error code.
  - `test_mcp_invite_accepts_with_approval_grant` — verifies that calling `calendar_tasks.invite` with a valid `approval_grant` passes the policy check.
- The `calendar_tasks.invite` policy rule (tier3, `defaultDecision: needs_approval`, `requiresStepUp: true`) already exists in `packages/contracts/mcp/catalogue/calendar_tasks.yaml`. The MCP server's `validateAndAuthorizeCall` correctly rejects tier3 calls without `approval_grant` and allows them with a valid grant.
- Both tests import `issueToken` from `@nova/contracts/service-token` to generate valid JWTs and set `NOVA_SERVICE_JWT_SECRET` / `NOVA_SERVICE_JWT_ISSUER` env vars for JWT verification.

## Verification

- Verified via direct execution that invite calls without `approval_grant` return `code: approval_required`, and calls with `approval_grant` pass the policy check.
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass. Tree counts unchanged (no new directories/files added — test was added to existing `mcp/` directory).

## Notes

Task 09.12 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 09 now 11 done / 0 partial / 7 open; P6 now 42 done / 0 partial / 7 open; totals 238 done / 16 partial / 151 open (59%).

Remaining P6 tasks: 09.13 (conflict detection), 09.14 (ICS import/export), 09.15 (partial provider failure), 09.16 (Calendar page), 09.17 (lab 6), 09.18 (three-pane Inbox page).

No commit made (commit decision belongs to the owner).
