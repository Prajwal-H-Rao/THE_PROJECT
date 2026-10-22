# THE_PROJECT agent rules

These are the project rules. They include the global invariants from `~/.config/opencode/AGENTS.md` plus project detail. Where this file and `AGENT_CONFIG.md` differ on skill loading, this file wins.

## Global invariants (from ~/.config/opencode/AGENTS.md)

- Always use the ASD-STE100 language standard. This is unconditional. Use short active sentences, one idea per sentence, exact terms, and no ceremony. Apply it to every reply, report, plan, repo.md entry, changelog entry, commit message, and code comment.
- Read repo.md first when the active project has a repo.md. Use it to target files instead of rescanning the repo.
- Get explicit user approval before implementing functional or architectural changes.
- The two-negating-subagent loop runs in the primary agent only, and only for implementation changes. Negators are `general` subagents. A `general` subagent cannot launch subagents, so the loop cannot recurse. Plan, document, and config changes do not need negators.
- A stub skill is never coverage. Never count a stub as review, verification, or security work. Do not load an empty stub. Note the skip.
- **Never commit.** Do not run `git commit`, `git push`, or any command that creates a commit. The user will commit when they choose. Staging with `git add` is allowed, but the commit decision belongs to the user.

## Project agent rules

These are the project rules. They add detail on top of the global invariants.

### Skill loading

- First step of every turn: load applicable skills before planning or editing. Load a skill only when it has real content.
- A stub gives no value. Do not load an empty stub. Note the skip.
- Mandatory skill order when available and content-bearing: ponytail, ponytail-review (only when reviewing a diff), caveman, graphify (when a codebase question or graph exists), impeccable (when UI/frontend is touched), system-design (only when designing or architecting), claude-mem.
- ECC and security skills load on demand. Use ecc-guide when ECC itself matters. Use security-review for auth, secrets, input validation, security, and attack-path work. A stub security skill gives no coverage. Say so plainly.
- `AGENT_CONFIG.md` is the skill inventory. All 308 listed skills plus 4 rule-referenced skills are stubs on this machine. Their IDs, scopes, and discovery wiring are complete.

### Skill origin: manual vs downloaded

Every skill on this machine is a hand-placed stub. None was downloaded with its real content. The names come from three public collections and one hand-made set. Treat the origin as provenance, not as proof the skill has content.

Downloadable collections (fetch content from here):

- ECC (Everything Claude Code) — `https://github.com/affaan-m/ECC` — MIT, ~249 skills. Supplies the `ecc-*` names (`ecc-guide`, `ecc-recipes`, `configure-ecc`) and many of the global security and engineering skills.
- Trail of Bits skills — `https://github.com/trailofbits/skills` — CC-BY-SA-4.0. Supplies the `trailmark` family (`trailmark`, `genotoxic`, `vector-forge`, `graph-evolution`, `diagramming-code`, `crypto-protocol-diagram`, `mermaid-to-proverif`, `constant-time-*`, `audit-augmentation`, `trailmark-*`) and the security-audit skills.
- Caveman — `https://github.com/JuliusBrussee/caveman` — MIT. Supplies the 16 cave-family skills: `caveman`, `caveman-commit`, `caveman-compress`, `caveman-discover`, `caveman-evidence-review`, `caveman-explore`, `caveman-help`, `caveman-learn`, `caveman-manage`, `caveman-optimize`, `caveman-review`, `caveman-setup`, `caveman-stats`, `cavecrew`, `megacave`, `ultracave`.

Hand-made skills (no public source — write the content yourself):

- The 29 system-design and engineering skills in the local agent scope: `api-design`, `architecture-diagram`, `back-of-the-envelope`, `blob-store`, `caching`, `consistency-coordination`, `content-delivery`, `data-storage`, `distributed-logging`, `distributed-search`, `dns`, `impeccable`, `investigate-first`, `lean-build`, `load-balancing`, `messaging-streaming`, `migration`, `observability`, `requirements-scoping`, `resilience-failure`, `safe-refactor`, `scaling-evolution`, `sequencer`, `service-decomposition`, `sharded-counters`, `surgical-patch`, `system-design`, `task-scheduling`, `verify-and-stop`.
- The 1 project skill: `graphify`.
- The 4 rule-referenced skills: `ponytail`, `ponytail-review`, `claude-mem`, `security-review`.

Security caution: a downloaded SKILL.md is agent instructions from a third party. Read it before you trust it. Prefer `trailofbits/skills-curated` for reviewed security skills. Never install a skill you have not read.

## Loading the agent

The dedicated primary agent is `the-project`, defined in `.opencode/agents/the-project.md`. Its system prompt carries these rules. It sets no model. The model is switchable in OpenCode at any time and is not tied to the agent.

- Start OpenCode from the repo root so it discovers `opencode.json`, `AGENTS.md`, and `.opencode/agents/`: run `opencode`.
- Select the `the-project` agent when the session starts. If it is not selected, OpenCode falls back to `build`.
- `the-project` can spawn `general` and `explore` subagents for the negation loop. Every other subagent is denied.
- Verify it loaded: `opencode service status` prints the server URL. `opencode api get /api/info` prints the version.

## Change workflow

- Never assume. Ask before planning, editing, or making a functional or architectural change.
- Get explicit user approval before implementing functional or architectural changes.
- For every proposed implementation change: state the approach plainly. Spawn two independent subagents in parallel with no reasoning leak. Force both to negate the approach.
- If either subagent proves the approach wrong, revise and rerun the loop.
- Proceed only when both say: no blocking objections, and the approach is sound.
- The loop runs in the primary agent only. Negators are `general` subagents, which cannot launch subagents. Plan, document, and config changes do not need negators.

## Code rules

- Files must be under 200 lines. Split into modules first. `AGENT_CONFIG.md` is a preserved source manifest and is a disclosed exception.
- Each module does one job.
- Every file and module gets a header comment. Each function gets a one-line purpose comment. Comment WHY for non-obvious logic.
- Follow the ponytail ladder: native/stdlib first, reuse before rewrite, shorter path wins, no speculative abstraction.
- Never strip trust-boundary validation, error handling, security, or accessibility basics.
- After every successful change: update repo.md, add `changes/YYYY-MM-DD-short-slug.md`, and ask before commit.

## Definition of done

Both subagents signed off. The user approved. Code is modular, commented, and under line limits. repo.md is updated. A changelog entry exists. ASD-STE100 was used throughout.