# 2026-10-11 — Skill provenance and agent loading docs

## Goal

Document where each skill's content comes from. Separate hand-made skills from downloadable ones. Explain how to load the configured agent.

## What changed

- `AGENTS.md`: added `Skill origin: manual vs downloaded`. Added `Loading the agent`.
- `repo.md`: added the same two sections, condensed.

## Provenance findings

All 312 stubs were placed by hand. None was downloaded with real content. Names trace to three public collections plus a hand-made set:

- ECC — `https://github.com/affaan-m/ECC` — MIT. The `ecc-*` names and many global security and engineering skills.
- Trail of Bits — `https://github.com/trailofbits/skills` — CC-BY-SA-4.0. The `trailmark` family and security-audit skills.
- Caveman — `https://github.com/JuliusBrussee/caveman` — MIT. The 16 cave-family skills.

Hand-made, no public source: 29 local system-design skills, 1 project skill (`graphify`), and 4 rule-referenced skills (`ponytail`, `ponytail-review`, `claude-mem`, `security-review`).

## Loading the agent

- Run `opencode` from the repo root. It discovers `opencode.json` and `AGENTS.md` and loads the rules automatically.
- Default primary agent is `build`. It can spawn `general` and `explore` subagents for the negation loop.
- Free models on the built-in `opencode` provider (OpenCode Zen) need no API key. Example: `opencode/mimo-v2.6-flash-free`.
- Set a default with `"model"` in `opencode.json`, or add a provider with `opencode auth login`.

## Verification

- `AGENTS.md` 62 lines, `repo.md` 71 lines. Both under 200.
- Both new sections present in both files.
- `opencode` provider confirmed to serve free models with no auth file present.

## Notes

- Downloaded `SKILL.md` files are third-party agent instructions. Read before trusting. Prefer `trailofbits/skills-curated` for reviewed security skills.
- `AGENT_CONFIG.md` remains the preserved source manifest at 348 lines. Disclosed exception to the 200-line rule.
