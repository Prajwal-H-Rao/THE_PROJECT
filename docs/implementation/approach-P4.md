# Phase P4 implementation approach

Repo: /home/prajwal/THE_PROJECT (git repo; never commit). Nothing here is committed until you approve.

## Approach

Complete P4 (Design system) after P3 sign-off. P4 has 21 tasks across one module file. Each task names an artifact and a test. A task counts as complete only when its test passes.

P4 design tokens drive both themes. No component holds hardcoded text; every user-facing string comes from `apps/web/messages/en.json` with keys under the page that uses them.

## Files to touch (P4)

- `docs/plan/15-design-system.md` — tasks 1–21 (CSS tokens, shadcn/ui setup, message file, theme switch, 10 domain card variants, six agent UI states)

## P4 dependencies

P4 assumes P3 is complete. P4 consumes tokens from P3. P6–P9 domain pages consume P4 tokens without rebuilding them.

## Verification steps before code

1. Run `python nova/tests/layout/check_layout.py` — must exit 0.
2. Run `python nova/tests/layout/test_layout_checks.py` — must exit 0.
3. Confirm P3 tasks are done before starting P4 tasks.

## Negator readiness

This approach touches plan docs only. No service code changes yet. When the negator limit clears, send this document to two `general` subagents in parallel. Proceed only when both return SOUND.

## After negator sign-off

Implement tasks in order. Run the layout checker after each path change under `nova/`. Update `repo.md` and add a `changes/` entry per task. Do not commit — you commit when you choose.
