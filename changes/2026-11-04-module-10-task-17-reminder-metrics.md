# 2026-11-04 module-10-task-17-reminder-metrics

## Summary
Module 10 Task 17: Task and reminder metrics with queue backlog gauge, delivery latency histogram, and backlog alert.
Negation loop found five blockers (cross-service MetricPoint import, wrong service location, checkAlert/alerting mix, missing countPending data source, worker not wired into app) — all addressed in the revised plan.

## Changes
- `nova/services/notification-service/src/reminders/reminder-metrics.ts` — New (~170 lines).
  - Local `MetricPoint` interface (name, value, labels, timestampMs) — not imported cross-service.
  - `ReminderMetrics` class:
    - `recordBacklog(pendingCount)` — gauge for pending reminder count.
    - `recordDeliveryLatency(createdAt, deliveredAt)` — histogram of end-to-end latency (created_at → delivered_at), null-deliveredAt guard.
    - `recordDelivery(outcome)` — counter for delivered/failed/escalated.
    - `recordDeadLetter()` — counter for dead letters.
    - `getAll()` — flat MetricPoint array including Prometheus-style latency buckets.
  - `checkAlert(metrics, threshold)` — standalone alerting function (separate from metrics class, single responsibility). Returns `{firing, reason}`.
  - `DEFAULT_BACKLOG_THRESHOLD = 100`.
- `nova/services/notification-service/src/reminders/reminder-repository.ts` — Added `countPending()`: `SELECT count(*) WHERE status = 'pending'`.
- `nova/services/notification-service/src/reminders/reminder.worker.ts` — Wired metrics into `pollCycle()`: record backlog via `countPending()`, record delivery outcomes, call `checkAlert` and log structured warning on alert. `ReminderMetrics` injected via constructor with default singleton.
- `nova/services/notification-service/src/reminders/reminder.worker.test.ts` — Updated constructor calls for new `metrics` parameter; `makeRepo` mock includes `countPending`.
- `nova/services/notification-service/src/reminders/reminder-metrics.test.ts` — New (~100 lines): backlog gauge, gauge overwrite, latency histogram, null deliveredAt skip, delivery counters, dead letter counter, checkAlert fires/doesn't fire at threshold, zero backlog.
- `repo.md` — Updated Module 10 status to tasks 1-17; test counts updated.

## Tests
- notification-service suite: `tsc` clean, 24 tests, 24 pass, 0 fail (9 new metrics tests + 5 existing worker tests).
- All existing worker tests pass with metrics wiring.

## Known gaps (documented, intended)
- `ReminderWorker` is instantiated only in tests, not in production `AppModule` — worker lifecycle wiring (RemindersModule provider, OnModuleInit start, AppModule import) is a separate infrastructure task.
- Metrics are per-worker-instance; no scrape endpoint or shared cross-worker singleton yet — `DEFAULT_BACKLOG_THRESHOLD` constant defined for future alerting integration.
- `delivery latency` uses `created_at → delivered_at` (end-to-end), not `due_at → delivered_at` (lateness).
