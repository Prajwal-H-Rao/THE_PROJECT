-- Migration 06: tasks schema (tasks, notes)
-- Branch: 06
-- Creates tasks and notes tables in the tasks_reminders_service and notes_memory_service schemas.
-- Ownership column is indexed. Installs pgvector for semantic search (task 11).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE tasks_reminders_service.tasks (
    task_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT,
    status            TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'done', 'cancelled'
    priority          INTEGER NOT NULL DEFAULT 0,
    due_at            TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    parent_task_id    UUID REFERENCES tasks_reminders_service.tasks (task_id) ON DELETE SET NULL,
    recurrence_rule   TEXT,
    metadata          JSONB NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION tasks_reminders_service;

CREATE INDEX idx_tasks_user_id ON tasks_reminders_service.tasks (user_id);
CREATE INDEX idx_tasks_status ON tasks_reminders_service.tasks (status);
CREATE INDEX idx_tasks_due_at ON tasks_reminders_service.tasks (due_at);
CREATE INDEX idx_tasks_parent ON tasks_reminders_service.tasks (parent_task_id);

CREATE TABLE notes_memory_service.notes (
    note_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    title             TEXT NOT NULL,
    content           TEXT NOT NULL,
    content_vector    VECTOR(1536), -- pgvector column for semantic search (task 11)
    source_type       TEXT, -- 'manual', 'email', 'document', 'web'
    source_ref        TEXT, -- pointer to source (email_id, document_id, URL)
    tags              TEXT[] NOT NULL DEFAULT '{}',
    is_archived       BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION notes_memory_service;

CREATE INDEX idx_notes_user_id ON notes_memory_service.notes (user_id);
CREATE INDEX idx_notes_tags ON notes_memory_service.notes USING GIN (tags);
CREATE INDEX idx_notes_created_at ON notes_memory_service.notes (created_at);

-- pgvector IVFFLAT index for semantic search.
-- The 'lists' parameter should be tuned based on table size:
--   - For small datasets (<100K rows): lists = 10-100
--   - For large datasets: lists = rows / 1000 or sqrt(rows)
--   - Recommended: REINDEX with optimal lists after data load.
-- Default lists=100 is a reasonable starting point for development.
CREATE INDEX idx_notes_content_vector ON notes_memory_service.notes
    USING ivfflat (content_vector vector_cosine_ops)
    WITH (lists = 100);