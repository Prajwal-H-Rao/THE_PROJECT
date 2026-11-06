# NOVA services reference

This module lists every service, worker, and package. It tells you which hold
code, which are placeholders, and how to run each one.

## Implemented services

These run code. Each has its own README under `nova/services/<name>/README.md`.

### api-gateway

- Role: session, validation, rate limit, CSRF, trace IDs.
- Language: TypeScript, Next.js 16.
- Port: 8000 (`127.0.0.1`).
- Entrypoint: `npm start`.
- Env vars: `NOVA_SESSION_SECRET` (32+ bytes), `NOVA_SERVICE_JWT_SECRET` (32+
  bytes), `NOVA_ALLOWED_ORIGINS`, `NOVA_RATE_LIMIT_MAX`,
  `NOVA_RATE_LIMIT_WINDOW_MS`, `NOVA_MAX_BODY_BYTES`, `NOVA_TRUST_PROXY`,
  `NOVA_HOST`, `NOVA_PORT`, `NOVA_SERVICE_TOKEN_ISSUER`,
  `NOVA_SERVICE_TOKEN_AUDIENCE`.
- Health: `GET /health/live` (public), `GET /health/ready` (public).
- Routes: `GET /api/v1/[...slug]` (no domain path yet).
- Dockerfile: yes.
- Readme: `nova/services/api-gateway/README.md`.

### identity-service

- Role: OIDC login (Google/GitHub), sessions, TOTP, account linking, revocation.
- Language: TypeScript, NestJS.
- Entrypoint: `npm start`.
- Env vars: `NOVA_SESSION_SECRET` (32+ bytes), `NOVA_TOTP_ISSUER`.
- Endpoints:
  - `GET /auth/login/google`, `GET /auth/login/github` — OIDC with PKCE.
  - `GET /auth/callback/:provider` — callback, creates session cookies.
  - `POST /auth/logout` — revoke session.
  - `GET /totp/setup`, `POST /totp/enable`, `POST /totp/disable`,
    `POST /totp/verify`.
  - `GET /health/live`, `GET /health/ready`.
- Dockerfile: no.
- Readme: `nova/services/identity-service/README.md`.

### policy-approval-service

- Role: authorization, approval grants, bulk decisions, metrics, versioning.
- Language: TypeScript, NestJS.
- Entrypoint: `npm start`.
- Endpoints: `POST /policy/decide`, `POST /policy/decide/bulk`,
  `GET /policy/version`, `POST /policy/version/bump`,
  `POST /policy/grants`, `GET /policy/grants/:nonce/card`,
  `POST /policy/grants/:nonce/approve`,
  `POST /policy/grants/:nonce/reject`,
  `POST /policy/grants/:nonce/expire`,
  `POST /policy/grants/:nonce/edit`, `GET /policy/grants/metrics`,
  `GET /health/live`, `GET /health/ready`.
- Dockerfile: `Dockerfile.admin`.
- Readme: `nova/services/policy-approval-service/README.md`.

### audit-service

- Role: audit recording, querying, persistent hash chain.
- Language: TypeScript, NestJS.
- Entrypoint: `npm start`.
- Endpoints: `POST /audit/record`, `GET /audit/records`,
  `GET /health/live`, `GET /health/ready`.
- Dockerfile: no.
- Readme: `nova/services/audit-service/README.md`.

## Planned services (placeholders only)

These directories exist but hold no runnable code. Their trees hold `.gitkeep`
placeholders only.

- `document-service` (Flask, PDF/DOCX/CSV parsing, phase P3).
- `agent-orchestrator` (Flask, typed plans, phase P5).
- `model-gateway` (provider allow-list, quotas, redaction, phase P5). Holds a
  Dockerfile but no runnable code yet.
- `inbox-service`, `calendar-service`, `tasks-reminders-service`,
  `notes-memory-service`, `finance-service`, `trips-service`, `jobs-service`
  (domain services, phases P6–P8).
- `telegram-adapter`, `whatsapp-adapter` (chat channels, phase P9).
- `analytics-service`, `channels-service`, `content-service`,
  `deployment-service`, `employer-registry-service`, `messages-service`,
  `ml-service`, `notes-memory-service`, `notification-service`,
  `release-gate-service`, `resilience-service`.

To start one, copy `nova/services/_template/typescript/` or
`nova/services/_template/python/` and rename the package.

## Workers

Background jobs run under `nova/workers/`.

- `inference-worker` — holds `tasks/inference.py` and `__init__.py`. This is
  the only worker with code.
- `document-worker` — empty directory.
- `scheduler-worker` — empty directory.

## Shared packages

- `packages/contracts` — migration runner, migration SQL files (40 files),
  MCP tool definitions (`mcp/`), event contracts (`events/`), approval-hash,
  audit-contracts, grant-verification. Has code.
- `packages/design-system` — empty directory.
- `packages/generated-clients` — empty directory.

## Run commands

TypeScript service:

```bash
cd nova/services/<name>
npm ci
npm run build
npm test
npm start
```

Python service (template reference):

```bash
cd nova/services/<name>
pip install -r requirements.txt -r requirements-dev.txt
pytest
gunicorn "app:create_app()"
```

Pin versions: Flask 3.1.3, gunicorn 26.2.0, pydantic 2.14.1 for Python; Next
16.4.2 and Node 22.23.4 for TypeScript.
