# Phase P8 implementation approach

Repo: /home/prajwal/THE_PROJECT (git repo; never commit). Nothing here is committed until you approve.

## Approach

Complete P8 (Jobs agent and registry) after P7 sign-off. P8 has 46 tasks across two module files that interleave. Each task names an artifact and a test. A task counts as complete only when its test passes.

Interleaving rule (order-and-constraints.md rule 4):
- `12-jobs-agent` tasks 1 to 7 first (jobs service).
- `13-employer-registry` tasks 1 to 17 next (registry service).
- `12-jobs-agent` tasks 8 to 21 after `13` tasks 8 to 21.

P8 depends on claims-ledger C07–C10 (verified 2026-10-12, recheck before 2027-03-07): Greenhouse, Lever, Ashby, SmartRecruiters public job posting APIs.

## Files to touch (P8)

- `docs/plan/12-jobs-agent.md` — tasks across jobs agent domain
- `docs/plan/13-employer-registry.md` — tasks across employer registry domain

## P8 dependencies

P8 assumes P7 is complete. P8 depends on claims-ledger C07–C10 being verified. Gate E: job discovery and drafting with safe human handoff; exactly 250 IN + 250 GLOBAL seeds; source verification gates hold; fresh opening provenance; claim references stay truthful; no site-rule bypass.

## Verification steps before code

1. Run `python nova/tests/layout/check_layout.py` — must exit 0.
2. Run `python nova/tests/layout/test_layout_checks.py` — must exit 0.
3. Confirm P7 tasks are done before starting P8 tasks.

## Negator readiness

This approach touches plan docs only. No service code changes yet. When the negator limit clears, send this document to two `general` subagents in parallel. Proceed only when both return SOUND.

## After negator sign-off

Implement tasks in order. Run the layout checker after each path change under `nova/`. Update `repo.md` and add a `changes/` entry per task. Do not commit — you commit when you choose.
