# Phase P6 implementation approach

Repo: /home/prajwal/THE_PROJECT (git repo; never commit). Nothing here is committed until you approve.

## Approach

Complete P6 (Inbox, calendar, tasks, notes) after P5 sign-off. P6 has 37 tasks across two module files. Each task names an artifact and a test. A task counts as complete only when its test passes.

Code already exists under `nova/services/tasks-reminders-service/` (notes controller, repository, entity, module wiring) but plan file does not carry uniform DONE markers on every task.

## Files to touch (P6)

- `docs/plan/09-inbox-calendar.md` — task family 2: list/create/update/cancel user's own records per per-operation policy and approval
- `docs/plan/10-tasks-notes.md` — tasks 1–21 (task table, CRUD, recurrence, reminder scheduler, note table, object storage, search, tool families, web page, export/delete, remembered facts)

## P6 dependencies

P6 assumes P5 is complete. Reminder workers survive restart without duplicates. Provider IDs and persisted state verify results.

## Verification steps before code

1. Run `python nova/tests/layout/check_layout.py` — must exit 0.
2. Run `python nova/tests/layout/test_layout_checks.py` — must exit 0.
3. Confirm P5 tasks are done before starting P6 tasks.

## Negator readiness

This approach touches plan docs only. No service code changes yet. When the negator limit clears, send this document to two `general` subagents in parallel. Proceed only when both return SOUND.

## After negator sign-off

Implement tasks in order. Run the layout checker after each path change under `nova/`. Update `repo.md` and add a `changes/` entry per task. Do not commit — you commit when you choose.
