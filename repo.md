# repo.md

Project map for THE_PROJECT. Read this first. Use it to target files instead of rescanning the repo.

## Purpose

This repo has three purposes.

1. It holds an OpenCode agent setup. The source of truth is `AGENT_CONFIG.md`. It lists the mandatory agent rules and the full skill manifest. The setup turns that manifest into working OpenCode configuration.
2. It holds the NOVA build plan. The source of truth is `NOVA_Full_Updated_Spec.md`. `docs/plan/` turns that spec into an ordered feature plan.
3. It holds the NOVA monorepo tree. The source of truth is `NOVA_Full_Updated_Spec.md`. `nova/` holds the layout that the spec names. `nova/docs/layout-diff.md` records the difference between the spec catalogue and the spec layout.

## Layout

- `AGENT_CONFIG.md` — source manifest. Contains the mandatory rules, the skill lists, and the setup status. Preserved intact. Disclosed exception to the 200-line rule.
- `AGENTS.md` — project agent rules. OpenCode loads it automatically. Adds project detail on top of the global invariants.
- `opencode.json` — project config. Holds the permission rules.
- `.opencode/skills/` — project-scope skills. One stub: `graphify`.
- `changes/` — changelog entries. One file per change.
- `NOVA_Full_Updated_Spec.md` — NOVA spec. Source of truth for all NOVA content. 1546 lines, 74 fence-aware headings. It names the MCP surface and the tool catalogue.
- `NOVA_Employer_Targets_500.csv` — seed employer registry. 500 rows: 250 `IN`, 250 `GLOBAL`.
- `docs/plan/` — NOVA build plan. 25 files: index, order-and-constraints, claims ledger, coverage map, 21 module files. 390 tasks, 11 phases. No dates and no hour estimates. The plan holds feature order and constraints only.
- `docs/design-notes/` — the design notes. Each note records a technology deviation and its reason. The api-gateway note records the Next.js choice. The object-store note records the RustFS choice for module 01 task 7.
- `nova/` — NOVA monorepo tree. 108 directories below the root, 75 leaf directories, 37 `.gitkeep` placeholders. `nova/docs/layout-diff.md` records the 10 catalogue-to-layout differences. `nova/services/_template/` holds the Python and the TypeScript service skeleton. `nova/services/api-gateway/` holds the api-gateway-bff. It is a Next.js 16 app with route handlers and a proxy. Its `queues/` directory holds the BullMQ queue runner and the local event envelope encoder. `nova/packages/contracts/` holds the shared service identity contracts, the event envelope contract (now in `events/`), the migration tooling with 13 migration SQL files, and the pinned OpenAPI documents under `openapi/`. `nova/infra/compose/` holds the local stack over two files: the substrate `compose.yaml` and the run pieces `compose.platform.yaml`. Its secret file is ignored by git. A shared `x-role-passwords` anchor holds the 16 role password entries. The `postgres` service and the `tests` service both merge the anchor. It keeps the two lists in step. `nova/db/init/` holds the database roles and schemas. `nova/infra/observability/` holds the trace propagation contract. `nova/infra/edge/` holds the public HTTPS edge (Caddy). `nova/infra/scripts/` holds backup and restore scripts with a drill. `nova/services/policy-approval-service/` holds the policy and approval engine. `nova/services/identity-service/` holds the identity service with OIDC, sessions, TOTP, and account linking. `nova/tests/security/` holds the database and object isolation tests. `nova/tests/layout/` holds the checker for the tree, the record and the plan. It holds 22 modules. `nova/docs/architecture/` holds the service map and the copy of the layout diff record.
- `.github/workflows/ci.yml` — the single CI workflow. It runs the layout checks, the lint, the typecheck, the two template test suites, the contracts build and test, the api-gateway build and test, the api-gateway image proof (non-root and no secret values), the HTTPS edge proof, the compose isolation suites, the queue restart test with its trace-span compare, and the network guard test. It proves that the typecheck fails on a type error.
- `pyproject.toml` — tool config. It holds the ruff and the mypy settings. The mypy gate runs with `check_untyped_defs` on.
- `.gitignore` — repo root ignore file. Keeps the byte-code cache, the build output and the generated Next.js type file out of git.
- `README.md` — repo readme. It holds the project summary, the prerequisites, the install and run guide, the per-service setup status, and the rule to update it when a service lands.

Machine-global files live outside this repo:

- `~/.config/opencode/AGENTS.md` — global invariants. ASD-STE100, repo.md first, approval before implementation, implementation-only negation loop, stub-honesty.
- `~/.config/opencode/opencode.json` — global config. Registers the `local-agent-skills` source.
- `~/.config/opencode/skills/` — global-scope skills. 266 stubs.
- `~/.config/opencode/local-agent-skills/` — local agent skills. 45 stubs. Registered via the global `skills` array.

## Skill wiring

312 stubs are installed and discoverable:

- 262 global manifest skills in `~/.config/opencode/skills/`.
- 4 rule-referenced skills in `~/.config/opencode/skills/`: `ponytail`, `ponytail-review`, `claude-mem`, `security-review`.
- 45 local agent skills in `~/.config/opencode/local-agent-skills/`.
- 1 project skill in `.opencode/skills/`: `graphify`.

Every stub is a real `SKILL.md` with a valid ID. Every stub is hidden from the model's discovery list by `metadata: opencode/autoinvoke: false`. Every stub stays loadable by exact ID. To activate a skill, replace its body with real content and remove the `autoinvoke` line.

## Skill origin: manual vs downloaded

All 312 stubs were placed by hand. None was downloaded with real content. The names trace to three public collections plus one hand-made set.

Downloadable collections (fetch real content from here):

- ECC — `https://github.com/affaan-m/ECC` — MIT. The `ecc-*` names and many global security and engineering skills.
- Trail of Bits — `https://github.com/trailofbits/skills` — CC-BY-SA-4.0. The `trailmark` family and security-audit skills. Use `https://github.com/trailofbits/skills-curated` for reviewed skills.
- Caveman — `https://github.com/JuliusBrussee/caveman` — MIT. The 16 cave-family skills.

Hand-made (no public source — content must be authored):

- 29 local system-design skills: `api-design`, `architecture-diagram`, `back-of-the-envelope`, `blob-store`, `caching`, `consistency-coordination`, `content-delivery`, `data-storage`, `distributed-logging`, `distributed-search`, `dns`, `impeccable`, `investigate-first`, `lean-build`, `load-balancing`, `messaging-streaming`, `migration`, `observability`, `requirements-scoping`, `resilience-failure`, `safe-refactor`, `scaling-evolution`, `sequencer`, `service-decomposition`, `sharded-counters`, `surgical-patch`, `system-design`, `task-scheduling`, `verify-and-stop`.
- 1 project skill: `graphify`.
- 4 rule-referenced skills: `ponytail`, `ponytail-review`, `claude-mem`, `security-review`.

Read any downloaded `SKILL.md` before you trust it. It is third-party agent instruction.

## The custom agent

- ID: `the-project`. File: `.opencode/agents/the-project.md`. Mode: `primary`.
- It is the dedicated primary agent for this repo. Its system prompt carries the manifest rules: repo.md first, the implementation-only negation loop, the code rules, and the unconditional ASD-STE100 mandate.
- It sets no model. The model is switchable at any time in OpenCode and is not tied to the agent.
- `opencode.json` allows the parent to spawn `the-project` as a subagent. `general` and `explore` stay allowed for the implementation negation loop. Every other subagent is denied.

## Loading the agent

- Run `opencode` from the repo root. It discovers `opencode.json`, `AGENTS.md`, and `.opencode/agents/`.
- Select the `the-project` agent when the session starts. If it is not selected, OpenCode falls back to `build`.
- Check the server with `opencode service status`. Check the version with `opencode api get /api/info`.

## Conventions

- ASD-STE100 language, always. Short active sentences. One idea per sentence. Exact terms. No ceremony.
- Files under 200 lines. `AGENT_CONFIG.md` is the disclosed exception. The generated package lock files are the second exception.
- Update this file after every change. Add a `changes/` entry. Ask before commit.

## Verified counts (2026-10-11)

- Stubs: 312. Unique IDs: 312. Nested `autoinvoke` flags: 312.
- Global 266, local 45, project 1.
- `AGENT_CONFIG.md`: 348 lines. sha256 `d31286006116d615390f3c56fafb67bfeffba017f8f4fc9ef160a9b84c645415`.

## Verified tree counts (2026-10-26)

- Tree: 116 directories below `nova/`, 80 leaf directories, 37 `.gitkeep` placeholders.
- Catalogue: 23 entries. Deployable layout paths: 22. Exact name matches: 15.
- Layout diff: 10 rows. 3 catalogue-only, 2 layout-only, 5 renamed.
- Checker: 28 checks, 72 mutations, 4 acceptance scenarios.
- `nova/services/packages/` was an unrecorded duplicate of the spec-named `nova/packages/`. Removed on 2026-10-22. The tree matches the spec layout again.
- NOVA build status: module 01 tasks 6 to 9, batch 2a (tasks 12, 13, 16 plus the task 10 record), and tasks 11, 14, and 17 are done. One W3C trace id spans the gateway, the envelope and the queue restart proof. The api-gateway image builds multi-stage, pinned, non-root, and the CI proves it holds no secret value. The HTTPS edge (Caddy) terminates TLS, proxies to the gateway, and the CI proves HTTPS works and plain HTTP is refused. The contracts package exports `./event-envelope`, `./event-consumers`, `./event-consumers.sql`, `./service-api`, `./migrations`, `./grant-verification`, `./grant-verification-types`, `./audit-contracts`, and `./mcp`. Module 02 tasks 1 to 5, 9, 10, 11, 12, 13, 14, 15, 16, 17 are done: migration tooling with 25 migration SQL files (roles, identity, audit with hash chaining, policy, inbox, tasks with pgvector, finance, trips, jobs, registry, export/deletion, indexes, audit search, password reset, refresh tokens, scopes, OIDC states, resource ownership, key rotation, account linking, unlink/revoke, rate limiting, CORS/CSP/SSRF, RBAC roles, approval grants, approval card, TOTP secrets), audit_log with append-only and check constraint, hash chaining, event envelope in `packages/contracts/events/` with backward-compat test and async SQL adapter, pgvector extension and vector index (lists=100), privacy review doc, export/deletion functions (fixed object ref accumulation, permanent deletion_object_refs table), backup/restore scripts with drill (age encryption, zstd), indexes on IDs/timestamps/ownership, audit search with role-based access and filter validation (fixed dynamic SQL), audit service HTTP endpoints for recording and querying audit events (`services/audit-service/`) with SQL adapter and persistent hash chain. Module 19 tasks 1 to 5 are done: technology table confirmed against spec, THIRD_PARTY.md with all npm transitive dependencies and licences, Lab 1 (OpenAPI fixture validation) in `labs/lab01/`, 18 design notes for technology choices and rejections, the lab registry with 13 labs and CI workflow `.github/workflows/labs.yml`. Module 08 tasks 1 to 15 are done: policy rule schema with actor/scope/sensitivity/target/blast-radius/risk-tier/isEscalation, family defaults for all 7 task families in `families.yaml`, decision endpoint returning allow/deny/needs_approval with payload-hash binding, approval grant record bound to payload hash, single-use consumption with race test, expiry and revocation, grant-verification helper, approval card API, grant outcomes (approve/reject/edit/expire), chat-approval policy (low-risk allow-list, payload binding, expiry/nonce checks), free-text rejection at policy boundary, audit every allow/deny with policy version and correlation ID, policy version pinning in grants, bulk-action policy with explicit isEscalation field, approval wait/expiry metrics with Prometheus format. Module 07 tasks 1 to 3 are done: OIDC flow with PKCE (code_verifier hashed), session cookies (HttpOnly, Secure, SameSite), TOTP with per-user salt for backup codes, account linking, comprehensive revocation. Lab 1 CI fixed to run in correct directory. **Module 06 tasks 1 to 21 are done: Pydantic v2 contracts (ParsedDocument, extraction envelope, settings), Flask app factory with blueprints/health/CORS, quarantine with magic byte checks and SHA-256, PDF/DOCX/CSV/TXT parsers with page/paragraph/column/row provenance, RQ worker on Redis with timeouts/dead-letter, sandboxed Dockerfile (non-root, read-only rootfs, dropped caps, seccomp), MinIO storage with content-addressed keys, inference worker + ML service (embeddings, classification, skill extraction), Labs 2 & 3 (parser evidence-linked profile, authenticated internal endpoint, network isolation proofs).** **Module 21 (MCP Surface) is complete: MCP tool definition contract with risk tiers, idempotency, quotas, and timeouts; MCP call/response wire contracts with UUID validation, ISO 8601 timestamps, and error codes; MCP audit event contract with recursive secret detection, circular reference protection, and exact-match semantics for sensitive keys; 173 tests passing including edge cases for circular references, nested secrets, timestamp formats, array rejection, and mutation safety.** All contracts package tests pass (173 tests). CI validates the full contract suite.