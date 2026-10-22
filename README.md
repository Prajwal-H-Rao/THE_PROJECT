# NOVA

NOVA is a self-hosted personal AI agent. It helps with inbox, calendar, tasks, notes,
expenses, trips, automations, and resume-driven job discovery. It runs as a set of
small services. Local models come first. Every external action has a policy check,
an approval step, and an audit record.

The spec is `NOVA_Full_Updated_Spec.md`. It is the source of truth. The build plan is
`docs/plan/`. This file covers the project summary, the setup, and how to install and
run the system.

## Status

- Implemented: repo checks, service templates, database roles and schemas, the local
  compose stack with Redis, RustFS and network guards, the shared service contracts,
  and the api-gateway.
- Not started: identity, policy, document parsing, agent runtime, model gateway, and
  the domain services. Their trees hold placeholders only.

## The services

| Service | Role | Status | Guide |
|---|---|---|---|
| `api-gateway` (Next.js 16) | session, validation, rate limit, CSRF, trace IDs | implemented | `nova/services/api-gateway/README.md` |
| `identity-service` | OIDC login, sessions, scopes | planned, phase P2 | — |
| `policy-approval-service` | authorization and approval grants | planned, phase P2 | — |
| `document-service` (Flask) | PDF/DOCX/CSV parsing with provenance | planned, phase P3 | — |
| `agent-orchestrator` (Flask) | typed plans, workflow state | planned, phase P5 | — |
| `model-gateway` | provider allow-list, quotas, redaction | planned, phase P5 | — |
| `inbox`, `calendar`, `tasks`, `notes`, `finance`, `trips`, `jobs` | domain services | planned, phases P6–P8 | — |
| `telegram-adapter`, `whatsapp-adapter` | chat channels | planned, phase P9 | — |

Each service gets a section below when it runs for the first time.

## Prerequisites

- Python 3.12
- Node 22.23.4 (pinned; `npm` ships with it)
- Docker Engine with Compose v2
- `git`

Optional, for phases P3 and P5:

- Ollama, for the local model runs (`ollama pull qwen3.5:2b` is the starting target)

## Install the repo tools

The lint and the typecheck use pinned versions:

```bash
python -m pip install --disable-pip-version-check ruff==0.17.1 mypy==2.4.0
```

Run the repo checks:

```bash
python nova/tests/layout/check_layout.py
ruff check .
mypy nova
```

CI runs the layout checks, the Python lint and typecheck, the template test suites,
the contracts build and test, the api-gateway build and test, the compose isolation
suites, the queue restart test, and the network guard test.

## Set up the data stack

The stack lives in `nova/infra/compose/` over two files. `compose.yaml` holds the
always-on services. `compose.platform.yaml` holds the init sidecar, the queue runner
and the probes. The stack runs Postgres 17 with one role per service, Redis for the
queue, and RustFS as the object store. No service publishes a port. They stay on the
internal networks.

```bash
cd nova/infra/compose
cp .env.example .env
# Open .env and set every password.
docker compose -f compose.yaml -f compose.platform.yaml up -d postgres
```

The init scripts in `nova/db/init/` create the roles and the schemas on first start.
The stack refuses to start with a missing password.

Run the isolation suites:

```bash
docker compose -f compose.yaml -f compose.platform.yaml --profile test run --rm --build object-init
docker compose -f compose.yaml -f compose.platform.yaml --profile test run --rm --build tests
```

`object-init` creates the two object identities. `tests` runs the database and the
object prefix isolation tests.

Stop the stack:

```bash
docker compose -f compose.yaml -f compose.platform.yaml down
```

The data volume survives `down`. Add `--volumes` to remove it.

## Run a service

Each TypeScript service uses `npm ci`, `npm run build`, `npm test`, `npm start`.
Each Python service uses `pip install -r requirements.txt -r requirements-dev.txt`,
`pytest`, and gunicorn. The current service list follows.

### api-gateway (implemented)

See `nova/services/api-gateway/README.md` for the full detail.

```bash
cd nova/services/api-gateway
npm ci
npm run build
npm run build:test
npm test
NOVA_SESSION_SECRET=<32+ bytes> npm start
```

The server binds `127.0.0.1:8000`. The health route is `/health/live` and it is public.
`NOVA_SESSION_SECRET` must hold at least 32 bytes. A missing secret makes every request
answer 500. `/api/internal/` routes take service JWTs instead of sessions. The gate
fails closed: `NOVA_SERVICE_JWT_SECRET` empty keeps those routes closed, and a present
secret must hold 32 bytes. Other settings: `NOVA_ALLOWED_ORIGINS`, `NOVA_RATE_LIMIT_MAX`,
`NOVA_RATE_LIMIT_WINDOW_MS`, `NOVA_MAX_BODY_BYTES`, `NOVA_TRUST_PROXY`, `NOVA_HOST`,
`NOVA_PORT`, `NOVA_SERVICE_TOKEN_ISSUER`, `NOVA_SERVICE_TOKEN_AUDIENCE`.

New services start from a template:

- `nova/services/_template/typescript/` — copy to `services/<name>/`, rename the package.
- `nova/services/_template/python/` — copy to `services/<name>/`, rename the `app` package.

## Dependency installation, per service type

| Service type | Install | Run | Test |
|---|---|---|---|
| TypeScript | `npm ci` | `npm run build && npm start` | `npm test` |
| Python (Flask) | `pip install -r requirements.txt -r requirements-dev.txt` | `gunicorn "app:create_app()"` | `pytest` |
| Stacks | Docker Compose | `docker compose up -d ...` | `--profile test` |

Pin every add-on version. The templates hold the pinned reference set: Flask 3.1.3,
gunicorn 26.2.0, pydantic 2.14.1 for Python; Next 16.4.2 and Node 22.23.4 for
TypeScript.

## Secrets

- Never commit a secret. `.env` files and secret files stay out of git.
- Keep secrets 32 bytes or larger where the service says so.
- The gateways never log a secret. The request log holds metadata only.

## Documentation map

- `NOVA_Full_Updated_Spec.md` — the spec. Source of truth.
- `docs/plan/` — the build plan. 11 phases, 390 tasks.
- `docs/plan/claims-ledger.md` — checked external facts, with recheck dates.
- `repo.md` — the project map for the agent. Read it first.
- `nova/docs/layout-diff.md` — the tree record against the spec catalogue.
- `nova/services/*/README.md` — one guide per service, as services land.

## Keep this README current

This file grows with the build. Do this when a service starts to run:

1. Add or update the service row in the table above.
2. Add a run section for it under "Run a service".
3. Update the "Status" line at the top.
4. Update `repo.md` and add a `changes/` entry.
