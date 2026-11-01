-- Migration 26: reminders schema (reminders, reminder_delivery_log)
-- Branch: 26
-- Creates reminders and reminder_delivery_log tables in the notification_service schema.
-- Spec:858 — queue tasks carry unique IDs, attempt count, deadline, idempotency key,
-- cancellation state and dead-letter outcome.

CREATE TABLE notification_service.reminders (
    reminder_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    title             TEXT NOT NULL,
    message           TEXT,
    due_at            TIMESTAMPTZ NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'delivered', 'failed', 'cancelled'
    idempotency_key   TEXT NOT NULL,
    attempt_count     INTEGER NOT NULL DEFAULT 0,
    max_attempts      INTEGER NOT NULL DEFAULT 5,
    cancelled_at      TIMESTAMPTZ,
    cancelled_reason  TEXT,
    dead_letter       BOOLEAN NOT NULL DEFAULT false,
    dead_letter_reason TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, idempotency_key)
) AUTHORIZATION notification_service;

CREATE INDEX idx_reminders_user_id ON notification_service.reminders (user_id);
CREATE INDEX idx_reminders_status ON notification_service.reminders (status);
CREATE INDEX idx_reminders_due_at ON notification_service.reminders (due_at);
CREATE INDEX idx_reminders_idempotency_key ON notification_service.reminders (idempotency_key);

CREATE TABLE notification_service.reminder_delivery_log (
    log_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id       UUID NOT NULL REFERENCES notification_service.reminders (reminder_id) ON DELETE CASCADE,
    provider_message_id TEXT,
    delivered_at      TIMESTAMPTZ,
    status            TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'delivered', 'failed'
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION notification_service;

CREATE INDEX idx_delivery_log_reminder_id ON notification_service.reminder_delivery_log (reminder_id);
CREATE INDEX idx_delivery_log_provider_message_id ON notification_service.reminder_delivery_log (provider_message_id);
