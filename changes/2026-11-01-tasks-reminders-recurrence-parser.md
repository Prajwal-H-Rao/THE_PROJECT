# 2026-11-01 tasks-reminders-recurrence-parser

## Summary
Module 10 (Tasks, Reminders and Notes) task 3: deterministic RRULE recurrence parser with timezone-aware occurrence generation.

## Changes
- `nova/packages/contracts/migrations/27-timezones-schema.sql` — New migration adds timezone column to tasks_reminders_service.tasks (not editing committed migration 06, preserving idempotent replay). Includes IANA time zone name comment per spec:858.
- `nova/services/tasks-reminders-service/src/tasks/task.entity.ts` — Added timezone field to Task, CreateTaskInput, UpdateTaskInput interfaces.
- `nova/services/tasks-reminders-service/src/tasks/task.repository.ts` — Updated INSERT/SELECT/UPDATE queries to include timezone column. Updated mapRow to read timezone with 'UTC' default.
- `nova/services/tasks-reminders-service/src/tasks/recurrence-parser.ts` — Pure RRULE parser: parses FREQ, INTERVAL, UNTIL, COUNT, BYDAY, BYMONTH, BYMONTHDAY, WKST into structured ParsedRule fields. Validates bounds. isValidRule helper.
- `nova/services/tasks-reminders-service/src/tasks/recurrence-service.ts` — Timezone-aware next occurrence generation from start date + parsed rule. Enforces COUNT and UNTIL bounds. BYDAY/BYMONTH/BYMONTHDAY filters. Task 16 owns full DST boundary cases; task 3 handles basic timezone-aware recurrence per spec:858.
- `nova/services/tasks-reminders-service/src/tasks/recurrence-parser.test.ts` — 9 parser tests (DAILY/WEEKLY/MONTHLY/YEARLY parsing, BYDAY, BYMONTHDAY, UNTIL/COUNT, invalid rules, isValidRule).
- `nova/services/tasks-reminders-service/src/tasks/recurrence-service.test.ts` — 8 service tests (DAILY/WEEKLY/MONTHLY/YEARLY occurrence generation, COUNT enforcement, UNTIL enforcement, BYDAY filter, invalid start date).
- `repo.md` — updated Module 10 task 3 status.

## Tests
28/28 tests pass across 4 test suites (recurrence-parser, recurrence-service, task.repository, task.service). TypeScript compiles cleanly (strict mode).

## Notes
No completeTask integration (task 4 owns that per plan). No migration 06 edits (new migration 27 adds timezone). Timezone-aware output satisfies spec:858. Task 16 still owns full DST boundary cases and due-time math. Files under 200 lines with header comments. ASD-STE100 language in all comments.