# NOVA handover guide

This handbook explains the NOVA codebase end to end. It is for operators and
maintainers who need to run, test, and deploy the system. Every statement cites
the file it comes from. This project uses plain, short sentences (ASD-STE100).

## Purpose

NOVA is a self-hosted personal AI agent. It helps with inbox, calendar, tasks,
notes, expenses, trips, automations, and resume-driven job discovery. It runs as
a set of small services. Local models come first. Every external action has a
policy check, an approval step, and an audit record.

The source of truth is `NOVA_Full_Updated_Spec.md`. The build plan is
`docs/plan/` (11 phases, 390 tasks).

## Where things live

- `nova/` — the NOVA monorepo tree (services, workers, packages, tests).
- `nova/infra/` — infrastructure (compose stack, edge, k8s stubs, scripts).
- `nova/docs/` — architecture, runbooks, threat model.
- `docs/` — design notes and the build plan.
- `changes/` — changelog entries, one per change.
- `repo.md` — project map for agents. Read this first.

## System parts

### Services

Each service owns one domain. Some run code. Some hold only a placeholder
directory. See `docs/handover-services.md` for the full list with run steps.

### Workers

Background jobs run in Python workers under `nova/workers/`. `inference-worker`
holds code in `tasks/inference.py`. `document-worker` and `scheduler-worker`
are empty directories.

### Shared packages

`nova/packages/` holds `contracts`, `design-system`, and `generated-clients`.
Only `contracts` has code. It holds the migration runner, migration SQL files,
MCP tool definitions, and event contracts.

### Data

Postgres holds the application data. `nova/db/init/` creates roles and schemas.
Migrations live in `nova/packages/contracts/migrations/` (40 files). See
`docs/handover-infra.md` for how migrations run.

### Object store

RustFS serves the S3 API. It replaces MinIO, whose public images were removed.
See `docs/design-notes/nova-object-store.md`.

### Edge

Caddy terminates HTTPS for `nova-gateway.test`. It uses an internal CA. See
`nova/infra/edge/Caddyfile`.

### Orchestration

`nova/infra/k8s/` holds `base`, `overlays/eks`, `overlays/kind`, and
`policies`. All four directories are empty. `nova/infra/terraform/aws/` is
empty. Production deploy is not yet implemented.

## Trust layers

The stack runs on three networks (spec:693): `nova-app`, `nova-untrusted`,
`nova-edge`, `nova-admin`, and `nova-classifier`. No service publishes a port.
All traffic stays inside the stack. Edge traffic enters through Caddy only.

## Security posture

- No secrets in git. `.env` files are ignored.
- Passwords guard every container start (`${VAR:?...}` guards).
- The gate fails closed: empty service JWT keeps internal routes closed.
- All migrations and init scripts are reviewed files.

## How to read the rest

- `docs/handover-services.md` — every service, worker, and package. Status,
  language, port, env vars, run steps.
- `docs/handover-infra.md` — compose stack, edge, deploy local, deploy prod.
- `docs/handover-tests.md` — test suites and CI.
- `NOVA_Full_Updated_Spec.md` — the spec. Source of truth.
