# Module 01 — Architecture and topology

Phase P1. Spec headings: architecture rules, logical architecture, service communication, system components, microservice catalogue, repo layout.

## Goal

The build creates a monorepo with 23 services from the Microservice Catalogue at spec:723-745. The repo layout at spec:913-968 does not match it. The layout holds 18 directories under `services/`, 3 under `workers/` and `apps/web`, so 22 entries in total. Twenty of those map to a catalogue entry. Three catalogue entries have no directory: `employer-registry-service`, `job-source-worker` and `integration-registry`. Two directories have no catalogue entry: `ml-service` and `document-worker`. `inference-worker` matches on both sides: `06-document-ml-sandbox` and `10-tasks-notes` build `workers/inference-worker/`, and `services/ml-service/` is its HTTP API. Five of the twenty shared entries use a different name: `api-gateway`, `telegram-adapter`, `whatsapp-adapter`, `audit-service` and `apps/web`. The catalogue wins on count and on responsibility. The layout wins on directory shape. Record every difference when you create the tree.

## Constraints (spec, binding)

Each bullet names the spec line it quotes. Quote marks mean verbatim text.

- Spec:10: "NOVA is a microservices application, not a modular monolith."
- Spec:14: "TypeScript services own API ingress, web/session identity, channel adapters, policy/approval, personal domain operations, external API integrations and orchestration API endpoints."
- Spec:15: "Python services using Flask own all document parsing and ML/NLP work."
- Spec:18: "No model direct access: a model sees a constrained context and returns candidate structured output."
- Spec:20: "A single Postgres cluster is acceptable for local and MVP deployment, with per-service schemas/roles and no cross-service write privileges."
- Spec:23: "Docker is the mandatory service packaging layer."
- Only the owning adapter calls an external integration.

## Build sequence

| # | Task | Artifact | Test |
|---|---|---|---|
| 1 | Create the monorepo tree from the spec layout at spec:913, then record the diff against the catalogue | `nova/` tree, `nova/docs/layout-diff.md`, `nova/tests/layout/` checks | The diff has exactly 10 rows: 3 catalogue-only, 2 layout-only and 5 renamed entries |
| 2 | Add lint, typecheck and a single CI workflow | `.github/workflows/ci.yml`, `pyproject.toml`, `nova/tests/layout/ci_checks.py`, `nova/tests/layout/ci_mutations.py` | CI fails on a type error |
| 3 | Write the service skeleton template | `services/_template/` | Template builds and serves `/health/live` |
| 4 | Build `api-gateway-bff` with session middleware, rate limiting, CSRF and trace IDs | `services/api-gateway/` | Gateway rejects an unauthenticated request |
| 5 | Add Postgres with one schema and one role per service | `infra/compose/`, `db/init/` | Service A cannot read service B's schema |
| 6 | Add Redis and one BullMQ queue | `services/api-gateway/queues/` | Job survives a container restart |
| 7 | Add MinIO with per-service prefixes | `infra/compose/` | Worker in prefix A cannot list prefix B |
| 8 | Implement workload identity: signed service JWTs with issuer, audience, expiry and scope | `packages/contracts/`, gateway middleware | Missing and invalid tokens are rejected |
| 9 | Add default-deny network rules in Compose and prove them on a placeholder untrusted container | `infra/compose/` | The placeholder untrusted container cannot reach Postgres |
| 10 | Define `/health/live` and `/health/ready` on every service created so far | each existing service | Health returns no secret material |
| 11 | Wire OpenTelemetry correlation IDs across gateway, services and workers | `infra/observability/` | One trace spans UI to DB |
| 12 | Publish versioned OpenAPI for two services | `packages/contracts/` | Contract test fails on a breaking change |
| 13 | Implement the event envelope and outbox pattern | `packages/contracts/` | Consumer records the event ID once |
| 14 | Build images for the services created so far: multi-stage, pinned digest, non-root, no secrets | each new `Dockerfile` | A container reports a non-zero uid. No secret string from the repo appears in the image layers. `17-deployment-hardening` adds the Trivy scan in P10. |
| 15 | Scaffold `apps/web` as a Next.js + React + Tailwind app with a build script | `apps/web/` | `npm run build` succeeds from a clean checkout |
| 16 | Write `docs/architecture`: service map, trust boundaries, data flow and the layout diff at `docs/architecture/layout-diff.md` | `docs/architecture/` | Each of the 23 catalogue services appears exactly once |
| 17 | Add the public HTTPS edge: a reverse proxy with a certificate and hostname, or a tunnel for local work | `infra/edge/` | An HTTPS request from outside reaches the gateway, and plain HTTP does not answer |

## Build order

Work these steps in order. A step names tasks from the table above.

1. Create the tree and the CI workflow.
2. Write the service skeleton template.
3. Stand up Postgres with per-service schemas.

## Acceptance tests

- `test_gateway_rejects_unauthenticated_private_call` — a direct call to a private service port without a service token returns 401.
- `test_service_cannot_read_peer_schema` — a query from service A against service B's schema fails.
- `test_untrusted_container_has_no_db_route` — the placeholder untrusted container fails to connect to Postgres. `06-document-ml-sandbox` repeats the same rule on the real parser in P3.
- `test_images_run_non_root` — `docker inspect` reports a non-zero user.
- `test_health_leaks_no_secret` — health output matches a fixed key list.

## Risks

- 23 services is heavy for one developer. Start with gateway, identity, policy, audit and one domain. Add the rest in the phase that needs them. Health and image tasks cover only services that exist at that point.
- Per-service schemas slow cross-domain joins. The spec forbids them. Use events.
- Workload identity in the MVP is service JWTs, not mTLS. mTLS is out of scope for this plan. Add it only when a service boundary crosses a host, and record that change in `changes/`.
