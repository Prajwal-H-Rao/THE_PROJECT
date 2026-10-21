# 2026-10-21 — Negation loop applies to implementation only

## Goal

Limit the two-negating-subagent loop to implementation changes. Plan, document, and config changes do not need negators.

## What changed

- `~/.config/opencode/AGENTS.md`: the loop line now says the loop runs only for implementation changes. It adds that plan, document, and config changes do not need negators.
- `AGENTS.md`: changed the trigger from "For every proposed change" to "For every proposed implementation change". Added the exemption line.
- `AGENT_CONFIG.md`: changed the mandatory rule the same way. The definition of done now says both subagents signed off on the implementation.
- `.opencode/agents/the-project.md`: changed the trigger the same way. The definition of done now says both subagents signed off on the implementation.
- `repo.md`: the three descriptions of the loop now say implementation-only.

## Design decisions

- The approval rule did not change. Plan and implementation changes still need explicit user approval before work starts.
- The loop stays in the primary agent. Negators stay `general` subagents. The recursion guard still holds.
- The loop is a review gate on code. It does not review prose. Running it on every doc edit cost more than it found.

## Verification

- Five rule lines changed. Each names the implementation-only scope.
- No other line in the global or project rules mentions the loop trigger.
- `repo.md` matches the new rule text.
