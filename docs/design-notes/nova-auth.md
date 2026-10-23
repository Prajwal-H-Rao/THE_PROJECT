# Auth/SSO

## Chosen (spec:430)

**OAuth2 (Google/GitHub OIDC)**

## Rationale

- Industry standard for secure login.
- Avoid DIY auth (credential storage, rotation, recovery, MFA).
- OAuth scopes cover Gmail/Calendar integration.
- Short-lived tokens, refresh token rotation, PKCE for public clients.

## Rejected

| Option | Reason |
|--------|--------|
| DIY auth | Reinventing authentication is a high-risk security activity. Credential storage, password reset, MFA, session management, and compliance (GDPR, SOC2) are solved problems with standard providers. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row. Provider policies and scopes may change.