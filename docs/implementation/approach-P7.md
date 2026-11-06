# Phase P7 implementation approach

Repo: /home/prajwal/THE_PROJECT (git repo; never commit). Nothing here is committed until you approve.

## Approach

Complete P7 (Finance and trips) after P6 sign-off. P7 has 18 tasks across one module file. Each task names an artifact and a test. A task counts as complete only when its test passes.

P7 uses CSV and PDF upload only for finance import (no Plaid or India Account Aggregator — claim in claims-ledger marked before P7 tasks start). Uncertain extraction is marked for review. Trip estimates are labelled as estimates.

## Files to touch (P7)

- `docs/plan/11-finance-trips.md` — tasks across finance and trips domains

## P7 dependencies

P7 assumes P6 is complete.

## Verification steps before code

1. Run `python nova/tests/layout/check_layout.py` — must exit 0.
2. Run `python nova/tests/layout/test_layout_checks.py` — must exit 0.
3. Confirm P6 tasks are done before starting P7 tasks.

## Negator readiness

This approach touches plan docs only. No service code changes yet. When the negator limit clears, send this document to two `general` subagents in parallel. Proceed only when both return SOUND.

## After negator sign-off

Implement tasks in order. Run the layout checker after each path change under `nova/`. Update `repo.md` and add a `changes/` entry per task. Do not commit — you commit when you choose.
