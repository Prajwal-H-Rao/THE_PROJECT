# NOVA

NOVA is a self-hosted personal AI agent. It helps with inbox, calendar, tasks,
notes, expenses, trips, automations, and resume-driven job discovery. It runs as
a set of small services. Local models come first. Every external action has a
policy check, an approval step, and an audit record.

The spec is `NOVA_Full_Updated_Spec.md`. It is the source of truth. The build
plan is `docs/plan/` (11 phases, 403 unique task IDs). The end-to-end handbook is
`docs/handover.md`, `docs/handover-services.md`, `docs/handover-infra.md`, and
`docs/handover-tests.md`.

## Status

Implemented: repo checks, service templates, database roles and schemas, the
local compose stack with Redis, RustFS and network guards, the shared service
contracts (including MCP tool definitions, call/response wire contracts, and
audit event contracts), the api-gateway, the identity service (OIDC PKCE,
sessions, TOTP), the policy/approval engine (grants, bulk decisions, metrics,
versioning), the audit service (persistent hash chain), the event envelope with
record-once consumers, backup/restore with age encryption.

Not started: document parsing, agent runtime, model gateway, domain services
(inbox, calendar, tasks, notes, finance, trips, jobs, employer registry), chat
channels (Telegram, WhatsApp). Their trees hold placeholders only.

## The services

| Service | Role | Status | Guide |
|---|---|---|---|
| api-gateway | session, validation, rate limit, CSRF, trace IDs | implemented | `nova/services/api-gateway/README.md` |
| identity-service | OIDC login, sessions, TOTP, account linking | implemented | `nova/services/identity-service/README.md` |
| policy-approval-service | authorization, approval grants, metrics | implemented | `nova/services/policy-approval-service/README.md` |
| audit-service | audit recording, hash chain | implemented | `nova/services/audit-service/README.md` |
| document-service | PDF/DOCX/CSV parsing | planned, P3 | — |
| agent-orchestrator | typed plans, workflow state | planned, P5 | — |
| model-gateway | provider allow-list, quotas | planned, P5 | — |
| inbox, calendar, tasks, notes, finance, trips, jobs | domain services | planned, P6–P8 | — |
| employer-registry-service | employer seed CSV importer, 500 targets | P8 task 1 done | `nova/services/employer-registry-service/src/csv-importer.ts` |
| telegram-adapter, whatsapp-adapter | chat channels | planned, P9 | — |

All other `nova/services/` directories hold `.gitkeep` placeholders only. To
start one, copy `nova/services/_template/typescript/` or
`nova/services/_template/python/` and rename the package.

## Workers

- `inference-worker` — holds `tasks/inference.py`. Only worker with code.
- `document-worker`, `scheduler-worker` — empty directories.

## Shared packages

- `packages/contracts` — migration runner, 40 migration SQL files, MCP tool
  definitions, event contracts. Has code.
- `packages/design-system`, `packages/generated-clients` — empty directories.

## Prerequisites

- Python 3.12
- Node 22.23.4 (pinned; npm ships with it)
- Docker Engine with Compose v2
- git

Optional, for phases P3 and P5: Ollama (`ollama pull qwen3.5:2b` is the
starting target).

## Install the repo tools

```bash
python -m pip install --disable-pip-version-check ruff==0.17.1 mypy==1.11.0
python nova/tests/layout/check_layout.py
ruff check .
mypy nova
```

The lint and typecheck steps are not testable locally because the local pip is
broken.

## Set up the data stack

The stack lives in `nova/infra/compose/` over two files. `compose.yaml` holds
the always-on services. `compose.platform.yaml` holds the init sidecar, the
queue runner, and the probes. The stack runs Postgres 17 with one role per
service, Redis for the queue, and RustFS as the object store. No service
publishes a port. They stay on internal networks.

```bash
cd nova/infra/compose
cp .env.example .env
# Open .env and set every password.
docker compose -f compose.yaml -f compose.platform.yaml up -d postgres
```

The init scripts in `nova/db/init/` create roles and schemas on first start:
`01-roles.sql`, `02-schemas.sql`, `03-queue-events.sql`. The stack refuses to
start with a missing password.

Run the isolation suites:

```bash
docker compose -f compose.yaml -f compose.platform.yaml --profile test run --rm --build object-init
docker compose -f compose.yaml -f compose.platform.yaml --profile test run --rm --build tests
```

Stop the stack:

```bash
docker compose -f compose.yaml -f compose.platform.yaml down
```

The data volume survives `down`. Add `--volumes` to remove it.

## Run the HTTPS edge

Caddy terminates HTTPS for `nova-gateway.test` with a TLS internal CA. Plain
HTTP is refused. Run:

```bash
cp .env.example .env
docker compose -f nova/infra/compose/compose.yaml \
  -f nova/infra/compose/compose.platform.yaml \
  --profile edge up -d --build --wait edge api-gateway
```

Then add `127.0.0.1 nova-gateway.test` to `/etc/hosts`. Trust the local CA
from the `caddy-data` volume (CI extracts `caddy-root-ca.pem`).

## Run an implemented service

TypeScript service:

```bash
cd nova/services/<name>
npm ci
npm run build
npm test
npm start
```

### api-gateway

```bash
cd nova/services/api-gateway
npm ci
npm run build
npm test
NOVA_SESSION_SECRET=<32+ bytes> npm start
```

The server binds `127.0.0.1:8000`. Health: `GET /health/live` and
`GET /health/ready` (public). `NOVA_SESSION_SECRET` must hold at least 32 bytes.
A missing secret makes every request answer 500.

Other settings: `NOVA_SERVICE_JWT_SECRET`, `NOVA_ALLOWED_ORIGINS`,
`NOVA_RATE_LIMIT_MAX`, `NOVA_RATE_LIMIT_WINDOW_MS`, `NOVA_MAX_BODY_BYTES`,
`NOVA_TRUST_PROXY`, `NOVA_HOST`, `NOVA_PORT`,
`NOVA_SERVICE_TOKEN_ISSUER`, `NOVA_SERVICE_TOKEN_AUDIENCE`.

### identity-service

```bash
cd nova/services/identity-service
npm ci
npm run build
npm test
NOVA_SESSION_SECRET=<32+ bytes> NOVA_TOTP_ISSUER=NOVA npm start
```

Endpoints: `GET /auth/login/google`, `GET /auth/login/github`,
`GET /auth/callback/:provider`, `POST /auth/logout`,
`GET /totp/setup`, `POST /totp/enable`, `POST /totp/disable`,
`POST /totp/verify`, `GET /health/live`, `GET /health/ready`.

### policy-approval-service

```bash
cd nova/services/policy-approval-service
npm ci
npm run build
npm test
npm start
```

Endpoints: `POST /policy/decide`, `POST /policy/decide/bulk`,
`GET /policy/version`, `POST /policy/version/bump`,
`POST /policy/grants`, `GET /policy/grants/:nonce/card`,
`POST /policy/grants/:nonce/approve`,
`POST /policy/grants/:nonce/reject`,
`POST /policy/grants/:nonce/expire`,
`POST /policy/grants/:nonce/edit`, `GET /policy/grants/metrics`,
`GET /health/live`, `GET /health/ready`.

### audit-service

```bash
cd nova/services/audit-service
npm ci
npm run build
npm test
npm start
```

Endpoints: `POST /audit/record`, `GET /audit/records`,
`GET /health/live`, `GET /health/ready`.

## Dependency installation, per service type

| Type | Install | Run | Test |
|---|---|---|---|
| TypeScript | `npm ci` | `npm run build && npm start` | `npm test` |
| Python | `pip install -r requirements.txt -r requirements-dev.txt` | `gunicorn "app:create_app()"` | `pytest` |

Pin versions: Flask 3.1.3, gunicorn 26.2.0, pydantic 2.14.1 for Python; Next
16.4.2 and Node 22.23.4 for TypeScript.

## Secrets

- Never commit a secret. `.env` files and secret files stay out of git.
- Keep secrets 32 bytes or larger where the service says so.
- The gateways never log a secret. The request log holds metadata only.

## Deploy local

The local compose stack is the only runnable deploy target. Follow "Set up the
data stack" above, then run each service from source. Services do not publish
ports; reach them only through the api-gateway or the Caddy edge.

## Deploy prod

Prod deploy is not implemented. `nova/infra/k8s/` holds `base`,
`overlays/eks`, `overlays/kind`, and `policies` — all empty.
`nova/infra/terraform/aws/` is empty.

To move to prod:

1. Implement k8s manifests under `nova/infra/k8s/` (namespaces, Deployments,
   NetworkPolicies, Restricted Pod Security Standards).
2. Implement terraform under `nova/infra/terraform/aws/`.
3. Replace the synthetic image digests in `compose.yaml` (ollama and caddy
   pins do not match the registry).
4. Configure secrets through your platform secret manager, not `.env` files.

The design note `docs/design-notes/nova-orchestration.md` selects kind/k3d
locally and AWS EKS optionally. `docs/design-notes/nova-packaging.md` selects
Docker / OCI images with multi-stage builds and non-root runtime users.

## Documentation map

- `NOVA_Full_Updated_Spec.md` — the spec. Source of truth.
- `docs/plan/` — the build plan. 11 phases, 403 unique task IDs. `docs/plan/status.md` holds the current status.
- `docs/plan/claims-ledger.md` — checked external facts, with recheck dates.
- `docs/handover.md` — purpose and layout.
- `docs/handover-services.md` — every service and worker.
- `docs/handover-infra.md` — compose stack, edge, deploy local, deploy prod.
- `docs/handover-tests.md` — test suites and CI.
- `repo.md` — project map for agents. Read this first.
- `nova/docs/layout-diff.md` — the tree record against the spec catalogue.
- `nova/services/*/README.md` — one guide per service, as services land.

## Keep this README current

This file grows with the build. Do this when a service starts to run:

1. Add or update the service row in the table above.
2. Add a run section for it under "Run an implemented service".
3. Update the "Status" line at the top.
4. Update `repo.md` and add a `changes/` entry.
