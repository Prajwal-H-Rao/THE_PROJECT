# NOVA infrastructure and deployment

This module covers the local compose stack, the HTTPS edge, deployment targets,
and the backup/restore scripts.

## Local stack (compose)

The stack lives in `nova/infra/compose/` over two files.

- `compose.yaml` — the substrate: Postgres 17, Redis, RustFS object store,
  ollama (planner + classifier), a tests service. Always-on.
- `compose.platform.yaml` — run pieces: object-init sidecar, two probes,
  policy-admin-service, api-gateway with the edge profile. Merged with `-f`.

### Start the substrate

Copy the secret file, fill every password, then start:

```bash
cd nova/infra/compose
cp .env.example .env
# Open .env and set every password.
docker compose -f compose.yaml -f compose.platform.yaml up -d
```

No service publishes a port. All traffic stays on internal networks. Bare `up`
starts both ollama images (~2 GB pulls). They carry memory limits of 12G and 4G.

The init scripts in `nova/db/init/` create roles and schemas on first start:
`01-roles.sql`, `02-schemas.sql`, `03-queue-events.sql`. The stack refuses to
start with a missing password (`${VAR:?...}` guards).

### Run the isolation suites

```bash
docker compose -f compose.yaml -f compose.platform.yaml --profile test run --rm --build object-init
docker compose -f compose.yaml -f compose.platform.yaml --profile test run --rm --build tests
```

`object-init` creates the two object identities. `tests` runs the database and
object prefix isolation tests.

### Stop the stack

```bash
docker compose -f compose.yaml -f compose.platform.yaml down
```

The data volume survives `down`. Add `--volumes` to remove it.

## HTTPS edge

Caddy terminates HTTPS for `nova-gateway.test` with a TLS internal CA. Plain
HTTP is refused (`auto_https off`, no `:80` listener). The edge reads the
upstream `api-gateway:8000` (`nova/infra/edge/Caddyfile`).

To run the edge with CI-compatible settings:

```bash
cp .env.example .env
docker compose -f nova/infra/compose/compose.yaml \
  -f nova/infra/compose/compose.platform.yaml \
  --profile edge up -d --build --wait edge api-gateway
```

Then add `127.0.0.1 nova-gateway.test` to `/etc/hosts`. Trust the local CA
from the `caddy-data` volume (CI extracts `caddy-root-ca.pem`).

## Kubernetes

`nova/infra/k8s/` holds `base`, `overlays/eks`, `overlays/kind`, and
`policies`. All four directories are empty. Production deploy on k8s is not yet
implemented. The design note `docs/design-notes/nova-orchestration.md` selects
kind/k3d locally and AWS EKS optionally, with namespaces, Deployments,
NetworkPolicies, and Restricted Pod Security Standards.

## Terraform

`nova/infra/terraform/aws/` is empty. Infrastructure-as-code is not yet
implemented.

## Scripts

- `backup.sh` — backs up the stack.
- `restore.sh` — restores from a backup.
- `backup-drill.sh` — runs the backup/restore drill.

## Secrets

- Never commit a secret. `.env` files and secret files stay out of git.
- Keep secrets 32 bytes or larger where the service says so.
- The gateways never log a secret. The request log holds metadata only.

## Prod deploy status

Prod deploy is not implemented. The local compose stack is the only runnable
deploy target. To move to prod, implement k8s manifests under
`nova/infra/k8s/`, terraform under `nova/infra/terraform/aws/`, and replace the
synthetic image digests in `compose.yaml` (ollama and caddy pins do not match
the registry).
