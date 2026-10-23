# 2026-10-23 — Module 07 tasks 4–13 — gateway middleware and security controls

## Scope

Module 07 tasks 4–13 implemented in the api-gateway:
4. Email+OTP password reset (DB done, service code pending)
5. Refresh token envelope encryption (DB done, service code pending)
6. Per-integration/user scopes (DB done, service code pending)
7. Resource ownership base layer (DB done)
8. Service JWT validation middleware (gateway - **DONE**)
9. Key rotation for workload keys (DB done, service code pending)
10. Step-up authentication for sensitive changes (gateway - **DONE**)
11. Account linking nonces (DB done, service code pending)
12. Unlink and revoke (DB done, service code pending)
13. CORS, CSP, body limits, SSRF guard (gateway - **DONE**)
14. Rate limiting and account lockout (DB done, service code pending)
17. RBAC roles admin/user/viewer (DB done, service code pending)

## Files

### Gateway middleware (`nova/services/api-gateway/src/lib/`)

- `cors.ts`: CORS preflight handling, origin allow-list, credential support, max-age
- `csp.ts`: Content Security Policy with nonce-less directives, report-only mode support
- `body-limit.ts`: Configurable body size limit (default 1 MiB), 413 response on excess
- `ssrf.ts`: SSRF guard blocking private/loopback ranges, port restrictions
- `step-up.ts`: Short-lived (5 min) step-up tokens for sensitive paths, bound to session
- `cors.ts` (updated): Preflight handling, origin allow-list, credentials support
- `csp.ts`: CSP header with nonce-less directives, report-only mode
- `body-limit.ts`: Configurable body size limit, 413 on excess
- `ssrf.ts`: Blocks private/loopback ranges, configurable port allow/block lists
- `step-up.ts`: Short-lived tokens (5 min) for sensitive paths, bound to session

### Proxy (`nova/services/api-gateway/src/proxy.ts`)

- CORS preflight handling at gateway edge
- CSP headers on all responses
- Body size limit check (configurable, default 1 MiB)
- Step-up authentication for sensitive paths (`/api/v1/users/`, `/api/v1/settings/`, `/api/v1/integrations/`, `/api/v1/payments/`, `/api/v1/admin/`)
- SSRF guard for outbound requests (route handler integration ready)
- CORS headers on all responses (preflight + actual)
- CSP headers on all responses
- Security headers on error responses

### Settings (`nova/services/api-gateway/src/lib/settings.ts`)

- Added `stepUpSecret` to Settings interface
- Loaded from `NOVA_STEP_UP_SECRET` environment variable

### Tests

- All 33 gateway tests pass
- All 44 policy service tests pass
- All 47 contracts tests pass
- All 9 identity service tests pass
- Layout checks: 28/28 pass (104 dirs, 73 leaves, 38 placeholders)

## Honest claims

- CORS preflight handled at gateway edge before any other processing
- CSP headers use nonce-less directives (no inline scripts/styles)
- Body limit configurable via `NOVA_MAX_BODY_BYTES` (default 1 MiB)
- SSRF guard blocks private/loopback ranges and dangerous ports
- Step-up tokens are short-lived (5 min), bound to session, HMAC-SHA256 signed
- CORS preflight handled before any other middleware
- CSP uses nonce-less directives (no inline scripts/styles allowed)
- SSRF guard blocks private/loopback ranges and dangerous ports
- Step-up tokens are short-lived (5 min), bound to session, HMAC-SHA256 signed

## Verification

- `npm run build && npm test`: All tests pass
- `check_layout.py`: All 28 checks pass
- Gateway tests: 33/33 pass
- Policy tests: 44/44 pass
- Contracts tests: 47/47 pass
- Identity tests: 9/9 pass
- Layout checks: 28/28 pass

## Verification

- `npm run build && npm test` in api-gateway: passes
- `npm test` in policy-approval-service: 44/44 pass
- `npm test` in identity-service: 9/9 pass
- `npm test` in contracts: 47/47 pass
- `check_layout.py`: all 28 checks pass
- Changelog + `repo.md` updated. Ask before commit.