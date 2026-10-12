# Module 19 — Technology choices and curriculum setup

Phase P1. Spec headings: Technology Choices (Comparison), Implementation & Learning Curriculum, Curriculum order and practical labs, Source and Design Notes.

## Goal

Fix each technology choice from the spec comparison table. Write the design notes that justify every choice and every rejection. Set up the lab harness.

Eleven of the twelve labs need artifacts that later phases own. Those labs run in the phase that owns the artifact. The table below names that phase for each lab. Module 19 delivers only lab 1, which P1 can satisfy.

## Technology choices (spec:421-438)

The spec decides these. This plan records the decision and the reason. Any deviation needs a written note in `docs/design-notes/`.

| Layer | Chosen (spec line) | Not chosen |
|---|---|---|
| Backend TypeScript | NestJS on Fastify (424) | Express, plain Fastify |
| Backend Python | Flask app factory with blueprints (430) | FastAPI, Django. Spec:1007 supersedes "FastAPI-based" |
| Validation | Pydantic v2 and pydantic-settings (431) | Joi, Zod in Python |
| Database | PostgreSQL with Prisma (425) | MySQL, SQLite beyond local dev |
| Queue | BullMQ on Redis (426) | RabbitMQ |
| Python workers | Celery or RQ, pick one (433) | Ad-hoc threads |
| Frontend | Next.js + React + Tailwind (427) | Vite-only, Svelte, Vue |
| Auth | OAuth2 Google or GitHub OIDC (428) | DIY auth |
| Agent workflow | LangGraph, LangChain selectively (432) | Raw LLM loops |
| Model gateway | Ollama local, optional LiteLLM adapter (434) | Direct provider calls |
| Document parsing | PyMuPDF or pdfplumber, python-docx, pandas (435) | Browser rendering as the primary parser |
| Observability | OpenTelemetry, Prometheus, Grafana (436) | Proprietary APM |
| Packaging | Docker, OCI, Docker Compose (437) | Language-specific bundlers |
| Orchestration | Kubernetes on kind or k3d locally; AWS EKS optional (438) | Compose only |
| Monitoring | Prometheus and Grafana (429) | CloudWatch-only |

No MCP protocol appears in the spec. The tool contract is the fixed registry at spec:500. Do not add MCP.

## Curriculum labs and their owning phase (spec:682-693)

| # | Lab | Owning module | Phase |
|---|---|---|---|
| 1 | Contracts before models | `19-tech-and-curriculum` | P1 |
| 2 | One vertical slice: upload, Flask parser, evidence-linked profile, React review view | `06-document-ml-sandbox` then `12-jobs-agent` | P3 (parser) + P8 (review) |
| 3 | Service identity and policy with the parser behind an authenticated endpoint | `06-document-ml-sandbox` | P3 |
| 4 | Agent workflow `plan → validate → await_approval → execute → verify → audit` | `03-agent-runtime` | P4 |
| 5 | Messaging channels: Telegram first, then WhatsApp | `14-channels` | P9 |
| 6 | One domain integration: Gmail read-only, then draft and send | `09-inbox-calendar` | P6 |
| 7 | Job search in permitted mode on a labelled set | `12-jobs-agent` | P8 |
| 8 | Docker hardening with isolation proofs | `17-deployment-hardening` | P10 |
| 9 | Kubernetes policy lab on kind or k3d | `17-deployment-hardening` | P10 |
| 10 | Production readiness: tracing, restore, scanning | `16-reliability-testing` | P10 |
| 11 | Small-model agent benchmark on identical fixtures | `05-model-strategy` | P3 |
| 12 | 500-employer directory import and pilot verification | `13-employer-registry` | P8 |

Every lab still runs inside the NOVA repository. The owning module carries its hours and its test.

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Confirm each technology row against spec:421-438 | this file | No deviation without a design note | 4 |
| 2 | Record version pins and licences for every dependency | `THIRD_PARTY.md` | Every entry names a licence | 4 |
| 3 | Lab 1: contracts with OpenAPI and Pydantic fixtures | `labs/lab01/` | All six schemas validate a fixture | 5 |
| 4 | Write source and design notes: every choice and every rejection with a reason | `docs/design-notes/` | Each rejected option has a reason | 5 |
| 5 | Create the lab CI workflow and register lab 1; each later lab registers itself in its own phase | `.github/workflows/labs.yml` | The workflow runs every listed lab and fails when a listed lab is absent | 4 |

This build sequence sums to 22 hours.

## Build order

Work these steps in order. A step names tasks from the table above. At 30 hours per week a phase spans several weeks, so a step may run into the next week.

1. Confirm the technology table against spec:421-438 and record version pins.
2. Deliver lab 1 and lab 3.
3. Write the source and design notes.

## Acceptance tests

- `test_registered_labs_run_in_ci` — the registry lists 12 labs, and the workflow fails when a listed lab has no runner.
- `test_every_dependency_names_a_licence` — a dependency without a licence fails the check.
- `test_no_fastapi_service` — no Python service imports FastAPI, which spec:1007 supersedes.
- `test_tool_contract_is_registry_not_mcp` — tools come from the registry at spec:500.
- `test_each_rejection_has_a_reason` — every row in the not-chosen column appears in `docs/design-notes/` with a reason.
- `test_every_lab_has_an_owner` — each of the 12 labs names a module file and a phase.
- `test_lab_registry_complete` — the registry lists 12 labs, and CI fails if a listed lab has no runner.

## Risks

- Labs drift from the code they teach. Build each lab from the real service code, not from a copy.
- A lab scheduled before its owning module cannot run. The phase column above is binding; if a phase slips, its lab slips with it.
- The comparison table is dated in places. Record a re-check date in `claims-ledger.md` before relying on a row.
