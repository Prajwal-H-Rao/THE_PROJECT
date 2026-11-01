-- Migration 33: note versions table
-- Branch: 31
-- Creates note_versions table in notes_memory_service schema for version history.
-- Migration 06 created notes table; this migration adds version history.

CREATE TABLE notes_memory_service.note_versions (
  note_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id         UUID NOT NULL REFERENCES notes_memory_service.notes (note_id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  source_type     TEXT,
  source_ref      TEXT,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      TEXT NOT NULL
) AUTHORIZATION notes_memory_service;

CREATE INDEX idx_note_versions_note_id ON notes_memory_service.note_versions (note_id);
CREATE INDEX idx_note_versions_created_at ON notes_memory_service.note_versions (created_at DESC);
