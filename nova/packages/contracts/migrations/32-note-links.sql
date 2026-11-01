-- Migration 32: note links table
-- Branch: 32
-- Creates note_links table in notes_memory_service schema for linking related notes.
-- Migration 06 created notes table; this migration adds the links table.

CREATE TABLE notes_memory_service.note_links (
  note_id    UUID NOT NULL REFERENCES notes_memory_service.notes (note_id) ON DELETE CASCADE,
  linked_id  UUID NOT NULL REFERENCES notes_memory_service.notes (note_id) ON DELETE CASCADE,
  link_type  TEXT NOT NULL DEFAULT 'related',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, linked_id)
) AUTHORIZATION notes_memory_service;

CREATE INDEX idx_note_links_linked_id ON notes_memory_service.note_links (linked_id);
