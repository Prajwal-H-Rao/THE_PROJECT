# Phase P5 implementation approach

Repo: /home/prajwal/THE_PROJECT (git repo; never commit). Nothing here is committed until you approve.

## Approach

Complete P5 (Agent runtime and scope lock) after P4 sign-off. P5 has 53 tasks across three module files. Each task names an artifact and a test. A task counts as complete only when its test passes.

Tasks already verified DONE: 12–20 (scope-lock red-team suite, admin plane network rule, denial metrics, PII exfiltration case, MCP surface in allow-list), 17–19 (agent-runtime per-user quotas, lab 4 LangGraph stub, Flask API boundary).

## Files to touch (P5)

- `docs/plan/21-mcp-surface.md` — tasks 4, 6, 11, 12 (MCP client, bind tools to family/scope/risk tier/verifier, MCP servers in calendar/inbox/finance/trips/WhatsApp/Telegram services)
- `docs/plan/03-agent-runtime.md` — tasks 1, 2, 3, 5 (register tools against MCP definition, 8 read-only tools, 6 write tools, deterministic router)
- `docs/plan/04-scope-lock.md` — task 4 (layer 2 scope clarification over router)

## P5 dependencies

P5 assumes P4 is complete. MCP surface comes from module 21. Write tools arrive from module 03. The router is deterministic; out-of-scope text returns a fixed refusal.

## Verification steps before code

1. Run `python nova/tests/layout/check_layout.py` — must exit 0.
2. Run `python nova/tests/layout/test_layout_checks.py` — must exit 0.
3. Confirm P4 tasks are done before starting P5 tasks.

## Negator readiness

This approach touches plan docs only. No service code changes yet. When the negator limit clears, send this document to two `general` subagents in parallel. Proceed only when both return SOUND.

## After negator sign-off

Implement tasks in order. Run the layout checker after each path change under `nova/`. Update `repo.md` and add a `changes/` entry per task. Do not commit — you commit when you choose.
