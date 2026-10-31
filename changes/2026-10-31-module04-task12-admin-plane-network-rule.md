# Module 04 Task 12: Layer 10 - Admin Plane Network Rule

## Summary
Implemented Layer 10 of the Scope Lock security model: Admin plane network isolation. Admin endpoints are now completely separated from the public internet (chat) and only accessible via the `nova-admin` Docker network.

## Changes

### New Files
- `nova/services/policy-approval-service/src/policy/policy-admin.controller.ts` - New admin controller with admin endpoints (`GET /policy-admin/rules`, `GET /policy-admin/rules/:id`, `GET /policy-admin/families`, `GET /policy-admin/validate`, `GET /policy-admin/version`)
- `nova/services/policy-approval-service/Dockerfile.admin` - Multi-stage Dockerfile for the admin service
- `nova/docs/runbooks/admin-plane-access.md` - Runbook for admin plane access

### Modified Files
- `nova/services/policy-approval-service/src/policy/policy.controller.ts` - Stripped admin endpoints, kept only service endpoints (`POST /policy/decide`, `POST /policy/decide/bulk`)
- `nova/services/policy-approval-service/src/policy/policy.module.ts` - Added both `PolicyController` and `PolicyAdminController`
- `nova/services/policy-approval-service/src/policy/policy-version.test.ts` - Updated tests to use `PolicyAdminController` for version endpoint tests
- `nova/services/policy-approval-service/tsconfig.json` - Added `"types": ["node"]` for Node.js test types
- `nova/infra/compose/compose.yaml` - Added `nova-admin` network (internal bridge)
- `nova/infra/compose/compose.platform.yaml` - Added `nova-admin` network to services, added `policy-admin-service` with admin profile, added `probe-admin-allow` and `probe-admin-deny` for network isolation testing
- `nova/infra/edge/Caddyfile` - Blocks `/policy-admin/*` paths (returns 404) to prevent public internet access

## Network Architecture
- **nova-app**: Application services (policy-service, api-gateway, etc.)
- **nova-untrusted**: Untrusted services (negative control probes)
- **nova-edge**: Public edge (Caddy) - joins nova-edge and nova-app
- **nova-admin**: Admin plane (internal, isolated) - only accessible via VPN/bastion/kubectl exec

## Security Properties
1. Admin endpoints NOT exposed via Caddy edge - Caddy returns 404 for `/policy-admin/*`
2. Admin endpoints require `policy:admin` scope - Service JWT with admin scope required
3. Network isolation enforced by Docker - `nova-admin` is an internal bridge network with `internal: true`
4. No direct internet access to admin plane

## Testing
- All 155 policy-approval-service tests pass
- All 183 contracts tests pass
- All 50 api-gateway tests pass
- All 12 audit-service tests pass
- Network isolation verified via `probe-admin-allow` (should connect from nova-admin) and `probe-admin-deny` (should fail from nova-app)

## Related
- Layer 9 (Task 11): Self-extension guard already implemented in `@nova/contracts/self-extension-guard.ts`
- Module 04 Tasks 1-11: Previous layers of the Scope Lock security model
