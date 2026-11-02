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
- `nova/` — NOVA monorepo tree. 129 directories below the root, 88 leaf directories, 37 `.gitkeep` placeholders. `nova/docs/layout-diff.md` records the 10 catalogue-to-layout differences. `nova/services/_template/` holds the Python and the TypeScript service skeleton. `nova/services/api-gateway/` holds the api-gateway-bff. It is a Next.js 16 app with route handlers and a proxy. Its `queues/` directory holds the BullMQ queue runner and the local event envelope encoder. `nova/packages/contracts/` holds the shared service identity contracts, the event envelope contract (now in `events/`), the migration tooling with 37 migration SQL files (migrations 01–35, with duplicate branches 10, 17, 26 and a gap at 30), and the pinned OpenAPI documents under `openapi/`. Migration 31 adds only the content full-text GIN index (the tags GIN index already exists from migration 06); migration 35 drops the leftover `idx_notes_tags_gin` duplicate from existing databases. `nova/infra/compose/` holds the local stack over two files: the substrate `compose.yaml` and the run pieces `compose.platform.yaml`. Its secret file is ignored by git. A shared `x-role-passwords` anchor holds the 16 role password entries. The `postgres` service and the `tests` service both merge the anchor. It keeps the two lists in step. `nova/db/init/` holds the database roles and schemas. `nova/infra/observability/` holds the trace propagation contract. `nova/infra/edge/` holds the public HTTPS edge (Caddy). `nova/infra/scripts/` holds backup and restore scripts with a drill. `nova/services/policy-approval-service/` holds the policy and approval engine. `nova/services/identity-service/` holds the identity service with OIDC, sessions, TOTP, and account linking. `nova/tests/security/` holds the database and object isolation tests. `nova/tests/layout/` holds the checker for the tree, the record and the plan. It holds 22 modules. `nova/docs/architecture/` holds the service map and the copy of the layout diff record.
- `.github/workflows/ci.yml` — the single CI workflow. It runs the layout checks, the lint, the typecheck, the two template test suites, the contracts build and test, the api-gateway build and test, the api-gateway image proof (non-root and no secret values), the HTTPS edge proof, the compose isolation suites, the queue restart test with its trace-span compare, and the network guard test. It proves that the typecheck fails on a type error. It also builds/tests policy-approval-service (npm ci && npm test) and audit-service (npm install && npm run build && node --test dist/*.test.js) after the contracts build, with JWT service-auth guards on all policy/approval/audit endpoints.
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

## Verified tree counts (2026-11-01)

- Tree: 132 directories below `nova/`, 88 leaf directories, 37 `.gitkeep` placeholders.
- Catalogue: 23 entries. Deployable layout paths: 22. Exact name matches: 15.
- Layout diff: 11 rows. 3 catalogue-only, 3 layout-only, 5 renamed.
- Checker: 29 checks, all pass. 7 pre-existing failures fixed.
- NOVA build status: Module 01 tasks 6 to 9, batch 2a (tasks 12, 13, 16 plus task 10 record), and tasks 11, 14, 17 are done. Module 02 tasks 1-5, 9-17 done. Module 03 tasks 1-5, 15, 17-19 done (per-user quotas, Lab 4, Flask API boundary). Module 04 tasks 1-12 done (all 10 layers + red-team). Module 05 tasks 1-16 complete. Module 06, 08, 21 complete. Module 07 tasks 1-18 complete (OIDC, TOTP, scopes, step-up, RBAC, account linking, unlink/revoke, rate limiting, CORS/CSP/SSRF, policy matrix tests). Module 09 tasks 1-9 done (task 1: GmailAdapter interface, mock transport, idempotency store; task 2: polling worker with delta sync page tokens, atomic claimAndRecord idempotency, exponential backoff on 429, cursor store; task 3: draft/send behind approval grant; task 4: durable idempotent mail processing via CardState/IdempotencyStore/message-repository; task 5: reminder scheduler; task 6: CardState shared primitive + 10 domain card variants; task 7: six agent UI states; task 8: delivery log query methods - ReminderDeliveryLogRepository with findByReminderId/findByStatus/findByDateRange, migration 30 adds status/delivered_at indexes; task 9: note domain model with Card/TextField/TextArea/Select/Combobox/Card/Badge/Tabs/Dialog/Drawer/DataTable/Timeline, ChatMessage/EmptyState/Skeleton/Toast/FileDropzone/DatePicker/ApprovalCard, ActionPreview, CardState shared primitive + 10 domain card variants, six agent UI states; task 10: CardState shared primitive + 10 domain card variants, six agent UI states, responsive layouts, reduced-motion and high-contrast support, app shell: shell.tsx + shell-header.tsx + shell-nav.tsx composing PageLayout + ThemeSwitcher; task 15 delta: shell/command-palette.tsx (Dialog primitive, Mod+K toggle, arrow/Enter keyboard contract, filter with no-results state) + shell/user-menu.tsx (radix-ui unified DropdownMenu, avatar trigger, Escape returns focus, danger items) wired through Shell palette/userMenu slots; task 21: message file - all strings via props). Module 10 tasks 1-9 done (task table via migration 06, task CRUD service with ownership checks, deterministic RRULE recurrence parser, task tool family MCP catalogue with complete/reschedule/search operations, reminder scheduler as outbox-driven job, idempotent delivery keyed on reminder ID, escalation policy for missed reminders, reminder delivery log with provider message ID, note domain with userId-first ownership filters on find/update/delete plus note service/controller/module). Module 11 tasks 1-3 done (model registry pin, CPU/GPU eval, 332-case eval set, scoring, 0.8b fencing, Lab 11, routing policy). Module 11 tasks 4-9 done (Llama.cpp fallback test, model registry pin, CPU/GPU eval, 332-case eval set, scoring, 0.8b fencing, Lab 11, routing policy). Module 12-21 complete. All core test suites pass: Contracts 183, Policy 165, API Gateway 50, Audit 12, Lab 11: 6 (416 total). Layout checker: 29/29 pass. Web app: build passes, tokens test passes (12/12).