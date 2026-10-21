# Module 07 — Identity, sessions and authorisation

Phase P2. Spec headings: Security & Access Control, Service Authentication and Authorization Standard, Authorization matrix.

## Goal

Each user holds one verified identity. Every service call authenticates the workload and authorises the operation. The service encrypts tokens at rest. Every sensitive change needs step-up authentication.

## Constraints (spec, binding)

Each bullet names the spec line it quotes. Quote marks mean verbatim text.

- Spec:233: "Users sign in via OAuth2/OpenID (Google or GitHub)."
- Spec:234: "Require TOTP (Google Authenticator) for user login. Also support email+OTP for password resets."
- Spec:781: "Never trust raw `X-User-Id`, `user_id` in a JSON body, or a model-generated actor ID."
- Spec:780: "Reject `none` algorithms, unrecognized keys/issuers/audiences, expired tokens, mismatched service IDs and unsigned requests."
- Spec:783: "no secrets in source, images, prompt contexts, audit payloads or error traces."
- Spec:236: "Do not log raw LLM prompts or personal content."
- A user token is not a service identity.

## Authorization matrix

The spec's 10-row matrix at line 788 is normative. Reproduce it as policy tests, one per row. Do not paraphrase it.

| Row | Operation | Approval required |
|---|---|---|
| 1 | Read own inbox or calendar | Usually not |
| 2 | Draft email or cover letter | Review before send |
| 3 | Send email | Required, exact payload binding |
| 4 | Create or update calendar event | Required when inviting others |
| 5 | Parse resume or bank file | User confirms critical fields |
| 6 | Search or rank jobs | No approval to search |
| 7 | Submit job application | Explicit per-application approval |
| 8 | Finance import or categorise | Review ambiguous or large imports |
| 9 | Link WhatsApp or Telegram identity | Trusted session confirms binding |
| 10 | Change integration scopes or delete data | Step-up auth plus confirmation |

## Build sequence

| # | Task | Artifact | Test |
|---|---|---|---|
| 1 | Implement the OIDC authorization-code flow with state and PKCE | identity service | Replay of `state` fails |
| 2 | Issue session cookies: `HttpOnly`, `Secure`, `SameSite` | gateway | CSRF on cookie writes fails |
| 3 | Implement TOTP enrolment and login | identity service | Wrong code rejected, replay rejected |
| 4 | Add email plus OTP for password reset | identity service | Token is single-use and time-boxed |
| 5 | Encrypt OAuth refresh tokens at rest with envelope encryption | identity service | Ciphertext only in DB and logs |
| 6 | Implement scopes per integration and per user | identity service | Scope escalation fails |
| 7 | Implement the resource-ownership check in the repository base layer. Every service created later extends it | repository base layer | Cross-user read fails |
| 8 | Build the service JWT validation middleware: issuer, audience, expiry, subject, scope. Every service inherits it from the shared gateway path. | gateway middleware | `alg: none` rejected |
| 9 | Add key rotation for workload keys | identity service | Old key fails after rotation |
| 10 | Implement step-up authentication for sensitive changes | gateway | Sensitive route demands fresh TOTP |
| 11 | Build the account-linking flow: one-time nonce issued only from a logged-in session | identity service | A nonce minted outside a logged-in session is refused |
| 12 | Implement unlink and revoke | identity service | Revocation stops future access |
| 13 | Add CORS allow-list, CSP, body and file limits, SSRF guard | gateway | Each control has a test |
| 14 | Add rate limiting and account lockout | gateway | Lockout triggers and recovers |
| 15 | Encode the 10 matrix rows as policy tests, against the rule schema `08-policy-approval` builds in tasks 1-3, before module 07 | policy service | All 10 pass |
| 16 | Verify no token or secret appears in logs or traces | log scan test | Scan is clean |
| 17 | Implement RBAC roles `admin` and `user`, checked by the decision endpoint `08-policy-approval` builds in task 3 | identity + policy | A `user` role is denied on an admin-classified tool call (spec:235) |
| 18 | Terminate TLS outside localhost. Set HttpOnly and SameSite cookies. Add CSRF protection, a CORS allow-list and a content security policy. | gateway + Compose | A request outside localhost is served over HTTPS, and a cookie-auth write without a CSRF token returns 403 (spec:785) |

## Build order

Work these steps in order. A step names tasks from the table above.

1. Implement the OIDC flow with PKCE and secure cookies.
2. Add TOTP and encrypted refresh tokens.
3. Build service JWT validation and the `alg: none` rejection test.

## Acceptance tests

- `test_alg_none_rejected` — a token with `alg: none` fails.
- `test_expired_service_token_rejected` — expiry holds.
- `test_cross_user_read_denied` — user A cannot read user B's resource.
- `test_csrf_on_cookie_write_rejected` — a cross-site write fails.
- `test_stepup_required_for_scope_change` — stale TOTP fails.
- `test_channel_nonce_single_use` — a second redemption of the same nonce fails. `14-channels` consumes the nonce in P9.
- `test_revocation_stops_access` — a revoked grant returns 401 on the next call.
- `test_no_secret_in_logs` — the log scan finds no token material.
- `test_matrix_rows_all_pass` — all 10 authorization matrix rows hold.
- `test_admin_role_restricted` — the policy layer denies an admin-classified tool call for the `user` role. `20-pages-and-automations` repeats the check on the privileged endpoints it builds in P9.
- `test_tls_and_csrf_hold` — outside localhost the edge serves only HTTPS, and a cookie-auth write without a CSRF token returns 403.

## Risks

- Google OAuth app verification has an external lead time. Use the test-user list until it clears. Track it in `order-and-constraints.md`.
- Self-managed TOTP has recovery risk. Offer email plus OTP as the recovery path, and document it.
- Ownership checks belong in the repository layer. A missing check in one endpoint is a data leak. Add a route-level test that scans for it.
