-- Migration 31: full-text search index on notes.content
-- Branch: 31
-- Adds a GIN index on the content column of notes_memory_service.notes
-- for full-text search using to_tsvector. Also adds a GIN index on tags.
-- Migration 06 created the notes table; this migration adds search indexes.

CREATE INDEX idx_notes_content_fts ON notes_memory_service.notes
    USING GIN (to_tsvector('english', content));

CREATE INDEX idx_notes_tags_gin ON notes_memory_service.notes
    USING GIN (tags);
