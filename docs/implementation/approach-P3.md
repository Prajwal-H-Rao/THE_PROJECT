# Phase P3 implementation approach

Repo: /home/prajwal/THE_PROJECT (git repo; never commit). Nothing here is committed until you approve.

## Approach

Complete P3 (Document sandbox and models) after P2 sign-off. P3 has 37 tasks across two module files. Each task names an artifact and a test. A task counts as complete only when its test passes.

P3 depends on claims-ledger rows C01–C06 (verified 2026-10-12, recheck before 2026-11-25). A stale claim blocks its dependent phase.

## Files to touch (P3)

- `docs/plan/06-document-ml-sandbox.md` — task 10 (RQ worker runtime on Redis, separate from Flask web workers, task timeouts, dead-letter path)
- `docs/plan/05-model-strategy.md` — tasks 1–16 (setup script, model-registry.yaml, pin tag/digest, context/output limits, 0.8b fence, fake CI model, benchmark, routing policy)

## P3 dependencies

P3 assumes P2 is complete. P3 depends on claims-ledger C01–C06 being verified.

## Verification steps before code

1. Run `python nova/tests/layout/check_layout.py` — must exit 0.
2. Run `python nova/tests/layout/test_layout_checks.py` — must exit 0.
3. Confirm P2 tasks are done before starting P3 tasks.

## Negator readiness

This approach touches plan docs only. No service code changes yet. When the negator limit clears, send this document to two `general` subagents in parallel. Proceed only when both return SOUND.

## After negator sign-off

Implement tasks in order. Run the layout checker after each path change under `nova/`. Update `repo.md` and add a `changes/` entry per task. Do not commit — you commit when you choose.
