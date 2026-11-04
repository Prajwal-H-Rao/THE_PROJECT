-- Migration 38: remembered_facts table
-- Branch: 38
-- Creates remembered_facts table in notes_memory_service schema.
-- Stores user-owned remembered facts with optional source provenance.
-- Soft delete via is_archived; hard delete (forget) removes the row entirely.
-- Spec:189 notes family includes "remembered facts" with per-item source,
-- edit, deletion and forget action.

CREATE TABLE notes_memory_service.remembered_facts (
  fact_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  fact_text    TEXT NOT NULL,
  source_type  TEXT,
  source_ref   TEXT,
  embedding    vector(384),
  is_archived  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION notes_memory_service;

CREATE INDEX idx_remembered_facts_user_id ON notes_memory_service.remembered_facts (user_id);
CREATE INDEX idx_remembered_facts_is_archived ON notes_memory_service.remembered_facts (is_archived);
