-- Migration 27: timezone column on tasks table
-- Branch: 27
-- Adds a timezone column to tasks_reminders_service.tasks so that
-- recurrence computation can anchor to the task's local time zone.
-- Migration 06 already created the tasks table with recurrence_rule.
-- This migration adds timezone support without editing migration 06,
-- preserving idempotent replay for databases that already applied it.

ALTER TABLE tasks_reminders_service.tasks
    ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';

CREATE INDEX idx_tasks_timezone ON tasks_reminders_service.tasks (timezone);

COMMENT ON COLUMN tasks_reminders_service.tasks.timezone IS
    'IANA time zone name (e.g., America/New_York, Europe/London, UTC). Used for recurrence and due-time computation per spec:858.';
