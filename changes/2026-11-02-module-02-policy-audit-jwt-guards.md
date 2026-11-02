# 2026-11-02 module-02-policy-audit-jwt-guards

## Summary
Effort 4 — JWT authentication guards for policy and audit endpoints (Module 02 / plan 07-identity-authz / 08-policy-approval): added NestJS `ServiceAuthGuard` (CanActivate) to policy-approval-service and audit-service, applied guards to all endpoints, fixed fail-open `extractCallerContext` to fail-closed, and wired `grants-lifecycle.controller.ts.edit()` to pass caller context to `decide()`.

## Changes
- `nova/services/policy-approval-service/src/policy/service-auth.guard.ts` — NEW: NestJS `CanActivate` guard. Uses `Reflector.getAllAndOverride` to read `audience` metadata from handler or class level. Extracts `Authorization: Bearer <token>`, verifies via `verifyToken` from `@nova/contracts`. On success attaches `request.user = claims`; on failure throws `UnauthorizedException`.
- `nova/services/policy-approval-service/src/policy/service-auth.guard.ts` — same as above (this IS the file above; listed for clarity).
- `nova/services/policy-approval-service/src/policy/policy.module.ts` — Added `ServiceAuthGuard` to `providers` and `exports`.
- `nova/services/policy-approval-service/src/policy/policy.controller.ts` — Added `@UseGuards(ServiceAuthGuard)` + `@SetMetadata('audience', 'policy-service')`. Changed `extractCallerContext` to throw `UnauthorizedException` on missing/invalid token (fail-closed instead of fail-open returning `{service: "unknown"}`).
- `nova/services/policy-approval-service/src/policy/policy-admin.controller.ts` — Added `@UseGuards(ServiceAuthGuard)` + `@SetMetadata('audience', 'policy-admin-service')`. Same `extractCallerContext` fix.
- `nova/services/policy-approval-service/src/approval/grants.controller.ts` — Added `@UseGuards(ServiceAuthGuard)` + `@SetMetadata('audience', 'policy-service')`.
- `nova/services/policy-approval-service/src/approval/grants-lifecycle.controller.ts` — Added `@UseGuards(ServiceAuthGuard)` + `@SetMetadata('audience', 'policy-service')`. Fixed `edit()` to accept `@Req() req: CallerRequest` and pass caller context to `policyDecisionService.decide()`.
- `nova/services/policy-approval-service/src/approval/grants-metrics.controller.ts` — Added `@UseGuards(ServiceAuthGuard)` + `@SetMetadata('audience', 'policy-service')`.
- `nova/services/audit-service/src/auth/service-auth.guard.ts` — NEW: Same guard for audit-service with audience "audit-service".
- `nova/services/audit-service/src/audit.module.ts` — Added `ServiceAuthGuard` to `providers` and `exports`.
- `nova/services/audit-service/src/audit.controller.ts` — Added `@UseGuards(ServiceAuthGuard)` + `@SetMetadata('audience', 'audit-service')`.
- `repo.md` — Updated CI workflow description to document JWT guard coverage.

## Tests
- `nova/services/policy-approval-service`: `tsc --noEmit` exit 0. `npm test`: 153 tests, 125 pass, 28 fail — all 28 failures are pre-existing (same count before changes, verified via `git stash`).
- `nova/services/audit-service`: `tsc --noEmit` exit 0. `npm test`: 12 tests, 12 pass, 0 fail.
- All files under 200 lines with header comments; no `any` types; ASD-STE100 throughout.

## Notes
- `grants.test.ts` directly instantiates `GrantsController` — unaffected because guards are decorator-based and only run in the NestJS HTTP pipeline.
- `policy-version.test.ts` directly instantiates `PolicyAdminController` with an auth header string — unaffected because `extractCallerContext` still accepts `@Headers("authorization")` strings.
- Health endpoints are NOT guarded — guard is applied per-controller, not globally via `APP_GUARD`.
- `extractCallerContext` now fails closed (throws `UnauthorizedException`) instead of fail-opening to `{service: "unknown", scopes: []}`. Since the guard already verified the token, `verifyToken` in `extractCallerContext` always succeeds for requests that reach the controller.
- `grants-lifecycle.controller.ts.edit()` now passes caller context (from `req.user` set by the guard) to `policyDecisionService.decide()`, fixing the fail-open caller issue.
- `request.user` is set via `context.switchToHttp().getRequest()` which returns `any` — no `@types/express` dependency needed.
