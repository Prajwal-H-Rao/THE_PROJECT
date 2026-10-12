# repo.md

Project map for THE_PROJECT. Read this first. Use it to target files instead of rescanning the repo.

## Purpose

This repo holds an OpenCode agent setup. The source of truth is `AGENT_CONFIG.md`. It lists the mandatory agent rules and the full skill manifest. The setup turns that manifest into working OpenCode configuration.

## Layout

- `AGENT_CONFIG.md` — source manifest. Contains the mandatory rules, the skill lists, and the setup status. Preserved intact. Disclosed exception to the 200-line rule.
- `AGENTS.md` — project agent rules. OpenCode loads it automatically. Adds project detail on top of the global invariants.
- `opencode.json` — project config. Holds the permission rules.
- `.opencode/skills/` — project-scope skills. One stub: `graphify`.
- `changes/` — changelog entries. One file per change.

Machine-global files live outside this repo:

- `~/.config/opencode/AGENTS.md` — global invariants. ASD-STE100, repo.md first, approval before implementation, negation-loop scope, stub-honesty.
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
- It is the dedicated primary agent for this repo. Its system prompt carries the manifest rules: repo.md first, the negation loop, the code rules, and the unconditional ASD-STE100 mandate.
- It sets no model. The model is switchable at any time in OpenCode and is not tied to the agent.
- `opencode.json` allows the parent to spawn `the-project` as a subagent. `general` and `explore` stay allowed for the negation loop. Every other subagent is denied.

## Loading the agent

- Run `opencode` from the repo root. It discovers `opencode.json`, `AGENTS.md`, and `.opencode/agents/`.
- Select the `the-project` agent when the session starts. If it is not selected, OpenCode falls back to `build`.
- Check the server with `opencode service status`. Check the version with `opencode api get /api/info`.

## Conventions

- ASD-STE100 language, always. Short active sentences. One idea per sentence. Exact terms. No ceremony.
- Files under 200 lines. `AGENT_CONFIG.md` is the disclosed exception.
- Update this file after every change. Add a `changes/` entry. Ask before commit.

## Verified counts (2026-10-11)

- Stubs: 312. Unique IDs: 312. Nested `autoinvoke` flags: 312.
- Global 266, local 45, project 1.
- `AGENT_CONFIG.md`: 348 lines. sha256 `d31286006116d615390f3c56fafb67bfeffba017f8f4fc9ef160a9b84c645415`.
