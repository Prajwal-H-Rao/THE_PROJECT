# Phase P1 implementation approach

Repo: /home/prajwal/THE_PROJECT (git repo; never commit). Nothing here is committed until you approve.

## Approach

Complete P1 (Repo, contracts, platform) before P2. P1 has 38 tasks across three module files. Each task names an artifact and a test. A task counts as complete only when its test passes.

Work order follows the plan and `docs/plan/order-and-constraints.md` rules 2, 3, 4:
- Rule 2: each curriculum lab runs in the phase that owns its artifact. Module 19 delivers only lab 1 in P1.
- Rule 3: a module task may name an artifact a later phase builds. The task targets a stub, a policy object, or a local runtime config. It never waits for the later service.
- Rule 4: P8 modules interleave; not relevant to P1.

## Files to touch (P1)

- `docs/plan/01-architecture.md` — tasks 6–13 (Redis, BullMQ queue, typed envelope, health endpoints, session token format, CSRF cookie, rate limiter extension)
- `docs/plan/02-data-and-audit.md` — tasks 6, 11, 13 (domain schemas, pgvector on notes schema, export/deletion workflow)
- `docs/plan/19-tech-and-curriculum.md` — lab registry and lab 1 runner

## Verification steps before code

1. Run `python nova/tests/layout/check_layout.py` — must exit 0 (currently green at 180/111/43).
2. Run `python nova/tests/layout/test_layout_checks.py` — must exit 0 (currently 74 mutations reject).
3. Confirm `nova/tests/layout/ignored_paths.py` covers any new build output names P1 adds (BullMQ queue output, Dockerfile layers).

## Negator readiness

This approach touches plan docs only. No service code changes yet. When the negator limit clears, send this document to two `general` subagents in parallel. Proceed only when both return SOUND.

## After negator sign-off

Implement tasks in order. Run the layout checker after each path change under `nova/`. Update `repo.md` and add a `changes/` entry per task. Do not commit — you commit when you choose.
