# 2026-11-01 notification-service-idempotent-delivery

## Summary
Module 10 (Tasks, Reminders and Notes) task 6: Idempotent reminder delivery keyed on reminder ID. New migration 28 adds idempotency_key UNIQUE constraint column to reminder_delivery_log. Repository split into reminder-repository.ts (CRUD) and reminder-delivery.ts (delivery) under 200 lines each. Atomic claim-and-deliver: claimReminder uses SELECT FOR UPDATE SKIP LOCKED to claim pending reminders as processing, delivery happens outside the transaction lock, markDelivered/markFailed match status='processing' and insert delivery log with ON CONFLICT idempotency_key DO NOTHING. ReminderWorker polls, claims, delivers, marks; reclaimOrphaned resets stuck processing reminders to pending after staleness threshold.

## Changes
- `nova/packages/contracts/migrations/28-idempotency-key-schema.sql` — New migration adds idempotency_key column with UNIQUE constraint to reminder_delivery_log (does not edit committed migration 26).
- `nova/services/notification-service/src/reminders/reminder-repository.ts` — ReminderRepository: create, findById, listDue, cancel, mapReminderRow (~130 lines).
- `nova/services/notification-service/src/reminders/reminder-delivery.ts` — ReminderDeliveryRepository: claimReminder (SELECT FOR UPDATE SKIP LOCKED → processing), markDelivered (status='processing' → delivered + INSERT delivery_log ON CONFLICT idempotency_key DO NOTHING), markFailed (status='processing' → failed/dead_letter + INSERT delivery_log ON CONFLICT), reclaimOrphaned (processing → pending after staleness threshold).
- `nova/services/notification-service/src/reminders/reminder.service.ts` — ReminderService: createReminder, getReminder, cancelReminder, listDueReminders, claimReminder, markDelivered, markFailed, reclaimOrphaned.
- `nova/services/notification-service/src/reminders/reminder.worker.ts` — ReminderWorker: poll cycle claims → delivers → marks; separate reclaim timer for orphaned processing reminders.
- `nova/services/notification-service/src/reminders/reminders.module.ts` — RemindersModule wires both repositories and service.
- `nova/services/notification-service/src/reminders/reminder-repository.test.ts` — Removed (old file deleted).
- `nova/services/notification-service/src/reminders/reminder.service.test.ts` — Updated for new constructor signature and claim/deliver/mark API.
- `nova/services/notification-service/src/reminders/reminder.worker.test.ts` — Updated for new worker architecture with claim → deliver → mark pattern.
- `repo.md` — updated Module 10 task 6 status.

## Tests
9/9 service tests pass, 4/4 worker tests pass. TypeScript compiles cleanly (strict mode).

## Notes
No transaction held open during external delivery (claim commits before delivery). idempotency_key UNIQUE constraint prevents duplicate delivery log rows across retries. Processing reminders reclaimed after 5-minute staleness threshold. Files under 200 lines each. ASD-STE100 language in all comments.