# 2026-11-01 notification-service-reminder-scheduler

## Summary
Module 10 (Tasks, Reminders and Notes) task 5: reminder scheduler as outbox-driven job at notification-service. Migration 26 for reminders and delivery_log tables.

## Changes
- `nova/packages/contracts/migrations/26-reminders-schema.sql` — Creates notification_service.reminders and reminder_delivery_log tables. Spec:858 — unique IDs, attempt count, deadline, idempotency key, cancellation state, dead-letter outcome.
- `nova/services/notification-service/package.json` — NestJS service scaffold (@nestjs/core, @nestjs/common, @nestjs/platform-fastify, pg, reflect-metadata)
- `nova/services/notification-service/nest-cli.json` — NestJS CLI config
- `nova/services/notification-service/tsconfig.json` — TypeScript config (NodeNext, strict)
- `nova/services/notification-service/src/reminders/reminder.entity.ts` — Reminder, CreateReminderInput, ReminderDeliveryLog interfaces
- `nova/services/notification-service/src/reminders/reminder.repository.ts` — ReminderRepository with pg Pool, SQL queries against reminders and reminder_delivery_log, markDelivered/markFailed transaction support, dead-letter logic when attempts exceed max
- `nova/services/notification-service/src/reminders/reminder.service.ts` — ReminderService with createReminder, getReminder, cancelReminder, listDueReminders; ReminderNotFoundError, ReminderAlreadyExistsError
- `nova/services/notification-service/src/reminders/reminder.worker.ts` — ReminderWorker with setInterval polling cadence, outbox-driven delivery, idempotent delivery (at most once), mark delivered/failed
- `nova/services/notification-service/src/reminders/reminders.module.ts` — RemindersModule wiring
- `nova/services/notification-service/src/app.module.ts` — AppModule with PG_POOL provider
- `nova/services/notification-service/src/main.ts` — NestJS Fastify entry point
- `nova/services/notification-service/src/reminders/reminder.service.test.ts` — 4 service tests (create, get not found, cancel not cancelled, list due)
- `nova/services/notification-service/src/reminders/reminder.worker.test.ts` — 4 worker tests (deliver success, delivery failure, no due reminders, no concurrent polls)
- `repo.md` — updated Module 10 task 5 status

## Tests
8/8 tests pass across 2 test suites. TypeScript compiles cleanly (strict mode).

## Notes
No DB connection in tests (mock pg Pool). Idempotent delivery: each reminder delivered at most once via markDelivered transaction. Dead-letter when attempts exceed maxAttempts. Uses migration 26 reminders schema. Files under 200 lines with header comments. ASD-STE100 language in all comments.