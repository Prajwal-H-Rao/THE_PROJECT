# 2026-11-01 notification-service-escalation-policy

## Summary
Module 10 (Tasks, Reminders and Notes) task 7: Escalation policy for missed reminders. Migration 29 adds escalation_attempts, escalated, escalated_at columns to reminders table. EscalationRepository.claimAndEscalate uses atomic UPDATE ... WHERE escalated = false with SELECT FOR UPDATE SKIP LOCKED. EscalationService.escalateMissed called before delivery poll in ReminderWorker.pollCycle. ReminderWorker.start() from main.ts with EscalationService wired via NestJS DI.

## Changes
- `nova/packages/contracts/migrations/29-escalation-schema.sql` — New migration adds escalation_attempts, escalated, escalated_at columns to notification_service.reminders table (does not edit committed migration 26).
- `nova/services/notification-service/src/reminders/escalation-repository.ts` — EscalationRepository: claimAndEscalate uses single atomic UPDATE ... WHERE escalated = false AND status != 'delivered' AND due_at < now() RETURNING ... FOR UPDATE SKIP LOCKED.
- `nova/services/notification-service/src/reminders/escalation-service.ts` — EscalationService: escalateMissed calls claimAndEscalate then escalateReminder for each claimed reminder. escalateReminder is a protected hook method for notification channel delivery.
- `nova/services/notification-service/src/reminders/reminder.worker.ts` — ReminderWorker updated: constructor accepts EscalationService, pollCycle calls escalateMissed before delivery polling, poll result includes escalated count.
- `nova/services/notification-service/src/reminders/reminders.module.ts` — RemindersModule wires EscalationRepository and EscalationService.
- `nova/services/notification-service/src/main.ts` — ReminderWorker.start() called from bootstrap with EscalationService from DI container.
- `repo.md` — updated Module 10 task 7 status.

## Tests
9/9 service tests pass (including escalateMissed test), 5/5 worker tests pass (including escalates missed reminders test). TypeScript compiles cleanly (strict mode).

## Notes
No transaction held open during external delivery (claim commits before delivery). escalated boolean flag prevents duplicate escalation. escalation_attempts counter tracks number of attempts. escalated_at timestamp records most recent escalation. Files under 200 lines each. ASD-STE100 language in all comments.