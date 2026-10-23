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
- `nova/` — NOVA monorepo tree. 79 directories below the root, 55 leaf directories, 38 `.gitkeep` placeholders. `nova/docs/layout-diff.md` records the 10 catalogue-to-layout differences. `nova/services/_template/` holds the Python and the TypeScript service skeleton. `nova/services/api-gateway/` holds the api-gateway-bff. It is a Next.js 16 app with route handlers and a proxy. Its `queues/` directory holds the BullMQ queue runner and the local event envelope encoder. `nova/packages/contracts/` holds the shared service identity contracts, the event envelope contract, and the pinned OpenAPI documents under `openapi/`. `nova/infra/compose/` holds the local stack over two files: the substrate `compose.yaml` and the run pieces `compose.platform.yaml`. Its secret file is ignored by git. A shared `x-role-passwords` anchor holds the 16 role password entries. The `postgres` service and the `tests` service both merge the anchor. It keeps the two lists in step. `nova/db/init/` holds the database roles and schemas. `nova/tests/security/` holds the database and object isolation tests. `nova/tests/layout/` holds the checker for the tree, the record and the plan. It holds 22 modules. `nova/docs/architecture/` holds the service map and the copy of the layout diff record.
- `.github/workflows/ci.yml` — the single CI workflow. It runs the layout checks, the lint, the typecheck, the two template test suites, the contracts build and test, the api-gateway build and test, the compose isolation suites, the queue restart test, and the network guard test. It proves that the typecheck fails on a type error.
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

## Verified tree counts (2026-10-23)

- Tree: 79 directories below `nova/`, 55 leaf directories, 38 `.gitkeep` placeholders.
- Catalogue: 23 entries. Deployable layout paths: 22. Exact name matches: 15.
- Layout diff: 10 rows. 3 catalogue-only, 2 layout-only, 5 renamed.
- Checker: 28 checks, 72 mutations, 4 acceptance scenarios.
- `nova/services/packages/` was an unrecorded duplicate of the spec-named `nova/packages/`. Removed on 2026-10-22. The tree matches the spec layout again.
- NOVA build status: module 01 tasks 6 to 9 and batch 2a (tasks 12, 13, 16 plus the task 10 record) are done. The queue payload holds one event envelope. The contracts package exports `./event-envelope` and `./service-api`. Module 02 task 9 re-exports the envelope when it lands.
