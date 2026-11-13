# changes/2026-11-13-install-autorouter-skill.md

## Summary

Installed the autorouter skill project-scoped. The skill routes user requests to the correct subagent, tool, or existing project skill.

## Files changed

- Created `.opencode/skills/autorouter/SKILL.md`. Real skill content. No `autoinvoke` line, so the skill is discoverable. Under 200 lines. ASD-STE100 throughout.
- Edited `AGENT_CONFIG.md`. Added `autorouter` to the Project skills list.
- Edited `AGENTS.md`. Updated the project skill count from 1 to 2 (`graphify` stub, `autorouter` active).
- Edited `repo.md`. Updated the live skill-wiring block: 311 stubs and 1 active skill; 2 project skills (`graphify` stub, `autorouter` active). Did not touch the dated verified-count snapshots.

## Verification

Both `general` subagents signed off: no blocking objections, approach is sound.

## Commit

Not committed. Staging with `git add` is allowed. The user decides when to commit.
