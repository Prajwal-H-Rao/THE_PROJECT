-- Migration 29: escalation columns on reminders table
-- Branch: 29
-- Adds escalation_attempts, escalated, escalated_at columns to
-- notification_service.reminders for escalation policy per spec:858.
-- Migration 26 created the reminders table without these columns.
-- Neither migration 26 nor 27 is edited here, preserving idempotent replay.

ALTER TABLE notification_service.reminders
    ADD COLUMN escalation_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE notification_service.reminders
    ADD COLUMN escalated BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE notification_service.reminders
    ADD COLUMN escalated_at TIMESTAMPTZ;

CREATE INDEX idx_reminders_escalated
    ON notification_service.reminders (escalated);

CREATE INDEX idx_reminders_escalation_attempts
    ON notification_service.reminders (escalation_attempts);

COMMENT ON COLUMN notification_service.reminders.escalation_attempts IS
    'Number of escalation attempts made for this reminder.';

COMMENT ON COLUMN notification_service.reminders.escalated IS
    'True once the reminder has been escalated at least once.';

COMMENT ON COLUMN notification_service.reminders.escalated_at IS
    'Timestamp of the most recent escalation attempt.';
