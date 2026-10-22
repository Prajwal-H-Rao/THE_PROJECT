# Module 19 — Technology choices and curriculum setup

Phase P1. Spec headings: Technology Choices (Comparison), Implementation & Learning Curriculum, Curriculum order and practical labs, Source and Design Notes.

## Goal

Fix each technology choice from the spec comparison table. Write the design notes that justify every choice and every rejection. Set up the lab harness.

Twelve of the thirteen labs need artifacts that later phases own. Those labs run in the phase that owns the artifact. The table below names that phase for each lab. Module 19 delivers only lab 1, which P1 can satisfy.

## Technology choices (spec:423-441)

The spec decides these. This plan records the decision and the reason. Any deviation needs a written note in `docs/design-notes/`.

| Layer | Chosen (spec line) | Not chosen |
|---|---|---|
| LLM/model provider | Qwen3.5 2B/4B quantized through Ollama or llama.cpp; optional approved cloud provider (425). Owner: `05-model-strategy` | Choosing a model by hype, or trusting a local model without measuring it |
| Backend TypeScript | NestJS on Fastify (426). The `api-gateway-bff` runs on Next.js 16 route handlers and the proxy (429), as the developer chose. The note is at `docs/design-notes/nova-api-gateway.md` | Express, plain Fastify |
| Backend Python | Flask app factory with blueprints (432) | FastAPI, Django. Spec:1011 supersedes "FastAPI-based" |
| Validation | Pydantic v2 and pydantic-settings (433) | Joi, Zod in Python |
| Database | PostgreSQL with Prisma (427) | MySQL, SQLite beyond local dev |
| Queue | BullMQ on Redis (428) | RabbitMQ |
| Python workers | RQ on Redis (436). Chosen over Celery because one developer runs a small self-hosted system | Celery, ad-hoc threads |
| Frontend | Next.js + React + Tailwind (429) | Vite-only, Svelte, Vue |
| Auth | OAuth2 Google or GitHub OIDC (430) | DIY auth |
| Agent workflow | LangGraph, LangChain selectively (434) | Raw LLM loops |
| Tool surface | MCP servers, one per owning service, with a shared tool catalogue (435) | A shared server that holds every provider credential |
| Model gateway | Ollama local, optional LiteLLM adapter (437) | Direct provider calls |
| Document parsing | PyMuPDF or pdfplumber, python-docx, pandas (438) | Browser rendering as the primary parser |
| Observability | OpenTelemetry, Prometheus, Grafana (439) | Proprietary APM |
| Packaging | Docker, OCI, Docker Compose (440) | Language-specific bundlers |
| Orchestration | Kubernetes on kind or k3d locally; AWS EKS optional (441) | Compose only |
| Monitoring | Prometheus and Grafana (431) | CloudWatch-only |

The product owner chose the MCP surface over the tool registry. `21-mcp-surface` owns the surface, the authorization and the tool bindings. The registry fields moved onto the MCP tool definition. The spec now names the MCP surface, and the change from the earlier registry wording is recorded in `docs/design-notes/`. The browser tool stays bounded, so the no-generic-browser rule holds.

## Curriculum labs and their owning phase (spec:685-696)

| # | Lab | Owning module | Phase |
|---|---|---|---|
| 1 | Contracts before models | `19-tech-and-curriculum` | P1 |
| 2 | One vertical slice: upload, Flask parser, evidence-linked profile, React review view | `06-document-ml-sandbox` then `12-jobs-agent` | P3 (parser) + P8 (review) |
| 3 | Service identity and policy with the parser behind an authenticated endpoint | `06-document-ml-sandbox` | P3 |
| 4 | Agent workflow `plan → validate → await_approval → execute → verify → audit` | `03-agent-runtime` | P5 |
| 5 | Messaging channels: Telegram first, then WhatsApp | `14-channels` | P9 |
| 6 | One domain integration: Gmail read-only, then draft and send | `09-inbox-calendar` | P6 |
| 7 | Job search in permitted mode on a labelled set | `13-employer-registry` | P8 |
| 8 | Docker hardening with isolation proofs | `17-deployment-hardening` | P10 |
| 9 | Kubernetes policy lab on kind or k3d | `17-deployment-hardening` | P10 |
| 10 | Production readiness: tracing, restore, scanning | `16-reliability-testing` | P10 |
| 11 | Small-model agent benchmark on identical fixtures | `05-model-strategy` | P3 |
| 12 | 500-employer directory import and pilot verification | `13-employer-registry` | P8 |
| 13 | MCP surface and tool authorization | `21-mcp-surface` | P5 |

Every lab still runs inside the NOVA repository. The owning module carries its test.

## Build sequence

| # | Task | Artifact | Test |
|---|---|---|---|
| 1 | Confirm each technology row against spec:423-441 | this file | No deviation without a design note |
| 2 | Record version pins and licences for every dependency | `THIRD_PARTY.md` | Every entry names a licence |
| 3 | Lab 1: contracts with OpenAPI and Pydantic fixtures | `labs/lab01/` | All six schemas validate a fixture |
| 4 | Write source and design notes: every choice and every rejection with a reason. Include the MCP surface deviation | `docs/design-notes/` | Each rejected option has a reason |
| 5 | Create the lab registry with all 13 labs. Each row has an owning module, a phase and a `planned` or `implemented` status. Add the CI workflow for the `implemented` rows. | `labs/registry.yaml` + `.github/workflows/labs.yml` | The registry has 13 rows, the workflow runs lab 1, and it fails when an `implemented` row has no runner |

## Build order

Work these steps in order. A step names tasks from the table above.

1. Confirm the technology table against spec:423-441 and record version pins.
2. Write the source and design notes.
3. Deliver lab 1, then register the other 11 labs with the module file, phase and status that owns each.

## Acceptance tests

- `test_registered_labs_run_in_ci` — the workflow runs the labs marked `implemented`, and fails when an `implemented` row has no runner.
- `test_every_dependency_names_a_licence` — a dependency without a licence fails the check.
- `test_no_fastapi_service` — no Python service imports FastAPI, which spec:1011 supersedes.
- `test_mcp_surface_is_scoped_and_authorized` — every MCP tool names a task family, a scope and a risk tier, and the surface sits inside the scope lock. `21-mcp-surface` enforces the same rule against the live catalogue in P5.
- `test_mcp_deviation_has_a_design_note` — the design note for the MCP surface names spec:503 and spec:504 and the reason.
- `test_each_rejection_has_a_reason` — every row in the not-chosen column appears in `docs/design-notes/` with a reason.
- `test_every_lab_has_an_owner` — each of the 13 labs names a module file, a phase and a status.

## Risks

- Labs drift from the code they teach. Build each lab from the real service code, not from a copy.
- A lab scheduled before its owning module cannot run. The phase column above is binding; if a phase moves, its lab moves with it.
- Parts of the comparison table go stale. Record a re-check date in `claims-ledger.md` before you rely on a row.
