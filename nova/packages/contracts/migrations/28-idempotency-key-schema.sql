-- Migration 28: idempotency key on reminder delivery log
-- Branch: 28
-- Adds an idempotency_key column to notification_service.reminder_delivery_log
-- with a UNIQUE constraint so that duplicate delivery log rows cannot be
-- inserted for the same reminder, even if a worker redelivers after a crash.
-- Migration 26 created the reminder_delivery_log table without this column.
-- Migration 27 added the timezone column to tasks. Neither is edited here,
-- preserving idempotent replay for databases that already applied them.

ALTER TABLE notification_service.reminder_delivery_log
    ADD COLUMN idempotency_key TEXT NOT NULL DEFAULT gen_random_uuid()::text;

ALTER TABLE notification_service.reminder_delivery_log
    ADD CONSTRAINT reminder_delivery_log_idempotency_key_unique
    UNIQUE (idempotency_key);

CREATE INDEX idx_reminder_delivery_log_idempotency_key
    ON notification_service.reminder_delivery_log (idempotency_key);

COMMENT ON COLUMN notification_service.reminder_delivery_log.idempotency_key IS
    'Stable key per reminder used to prevent duplicate delivery log rows across worker retries.';
