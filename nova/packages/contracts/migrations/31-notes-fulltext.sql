-- Migration 31: full-text search index on notes.content
-- Branch: 31
-- Adds a GIN index on the content column of notes_memory_service.notes
-- for full-text search using to_tsvector.
-- Migration 06 created the notes table; this migration adds the content index.
-- The tags GIN index already exists from migration 06; migration 12 re-creates it with IF NOT EXISTS.

CREATE INDEX idx_notes_content_fts ON notes_memory_service.notes
    USING GIN (to_tsvector('english', content));
