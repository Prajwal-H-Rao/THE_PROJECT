# 2026-10-12 — Custom primary agent

## Goal

Create a dedicated agent for THE_PROJECT instead of relying on the `build` fallback. Do not pin a model. The model is switchable in OpenCode at any time and is not tied to the agent.

## What changed

- Added `.opencode/agents/the-project.md`. A custom `primary` agent. Its system prompt carries the manifest rules: repo.md first, the negation loop, the code rules, and the unconditional ASD-STE100 mandate.
- `opencode.json`: added a `subagent` allow rule for `the-project`. `general` and `explore` stay allowed. Every other subagent stays denied.
- `repo.md` and `AGENTS.md`: rewrote the loading steps to name the `the-project` agent. Removed the model list and the `default_model` step. No model is referenced anywhere with respect to the agent.

## Design decisions

- No `model` key in the agent file or in `opencode.json`. The agent stays model-agnostic.
- `the-project` is `primary`, not `all`. A primary agent cannot be spawned by a subagent, so the recursion guard holds by construction even though a `subagent` allow rule names it.
- The agent lives in the project `.opencode/agents/` directory, so it travels with the repo.

## Verification

- Frontmatter parses. Fields: `description`, `mode: primary`, `color`. No legacy V2 fields.
- `opencode.json` is valid JSON. It contains no `model` key.
- No `model` string appears in the agent file.
- Line counts: agent 41 lines, `opencode.json` 11 lines. Both under 200.
