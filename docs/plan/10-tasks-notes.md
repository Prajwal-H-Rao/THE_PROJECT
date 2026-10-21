# Module 10 — Tasks, reminders and notes

Phase P6. Spec headings: Allowed task families (tasks, reminders, notes), Data Model (task and note rows), Reliability (reminder delivery half).

## Goal

Create, list, complete and reschedule tasks. Fire reminders once, at the right time, across restarts. Store notes with local search and optional embeddings.

## Constraints (spec, binding)

- Spec:854: "Scheduled reminder jobs need timezone-aware recurrence and deduplication windows."
- Spec:854: queue tasks carry "unique IDs, attempt count, deadline, idempotency key, cancellation state and dead-letter outcome."
- Spec:139: "Do not record a `succeeded` state until authoritative result evidence exists."
- Spec:736: notes-memory-service "supports per-item export/delete and vector deletion consistency."
- Spec:187: notes family is "search, create, update, export and delete explicitly user-owned notes and remembered facts."

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Create the task table: title, due, priority, status, owner, recurrence rule | migrations | Unique constraint on owner and id | 4 |
| 2 | Implement the task CRUD service with ownership checks | task service | Cross-user read fails | 5 |
| 3 | Implement recurrence with a deterministic rule parser | task service | RRULE cases pass | 6 |
| 4 | Register the task tool family: create, list, complete, reschedule, search | tool registry | Out-of-scope ops denied | 5 |
| 5 | Build the reminder scheduler as an outbox-driven job | `services/notification-service/` | Job survives restart | 6 |
| 6 | Add idempotent delivery keyed on reminder ID | notification service | Two workers, one delivery | 6 |
| 7 | Implement the escalation policy for missed reminders | notification service | Escalation fires once | 4 |
| 8 | Add the reminder delivery log with provider message ID | notification schema | Delivery row proves success | 4 |
| 9 | Create the note table with tags, links and a full-text index | migrations | Full-text search passes | 4 |
| 10 | Add object storage for long note bodies | notes schema | Pointer resolves to the object | 3 |
| 11 | Implement note create, update and version history | note service | History restores a prior version | 5 |
| 12 | Wire local embeddings from `workers/inference-worker/` as an optional index | `services/ml-service/` | Vector row deleted with the note | 5 |
| 13 | Implement search: full-text first, vector as a rerank | note service | Search returns note IDs | 5 |
| 14 | Register the note tool family: create, search, read, link, summarise | tool registry | Overwrite requires confirmation | 5 |
| 15 | Build the Tasks and Notes page: list, board and calendar views, snooze and overdue states, tagged notes with linked references | `apps/web/tasks/` | Every view renders from real data, an overdue task shows its overdue state, and no view shows sample data (spec:407) | 6 |
| 16 | Add timezone-safe due-time handling | task service | DST boundary case passes | 5 |
| 17 | Add task and reminder metrics: queue backlog, delivery latency | observability | Alert fires on backlog | 3 |
| 18 | Add per-item export and per-item delete for notes and remembered facts | note service | One note exports and deletes without touching others | 5 |
| 19 | Build remembered-fact controls: per-item source, edit, deletion and forget action | notes schema + web UI | A forgotten fact leaves no row and no vector | 5 |
This build sequence sums to 91 hours.


## Build order

Work these steps in order. A step names tasks from the table above. At 40 hours per week a phase spans several weeks, so a step may run into the next week.

1. Create the task table and the CRUD service with ownership checks.
2. Build the reminder outbox worker with idempotent delivery.
3. Add notes with full-text search, wire the optional embeddings index, then implement search over both.

## Acceptance tests

- `test_reminder_fires_once_across_restart` — restart the worker, delivery count stays at one.
- `test_concurrent_workers_single_delivery` — two workers, one delivery row.
- `test_due_time_survives_dst` — the reminder fires at the correct local time.
- `test_note_vector_deleted_with_note` — deleting a note also deletes its vector rows.
- `test_model_cannot_overwrite_note` — a summarise tool call never writes to the original note.
- `test_cross_user_task_denied` — the service checks ownership and denies the cross-user read.
- `test_recurrence_generates_next_occurrence` — completing a recurring task creates the next one.

## Risks

- The outbox pattern costs an extra table and a poller. It is the cheapest correct fix for lost reminders.
- Vector search adds a dependency and a reindex path. Ship full-text first, and gate embeddings behind a flag.
- Timezone bugs hide for months. Add the DST test before you trust a real reminder.
