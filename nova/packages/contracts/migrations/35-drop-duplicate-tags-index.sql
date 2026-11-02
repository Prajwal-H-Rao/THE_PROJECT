-- Migration 35: drop duplicate tags GIN index from notes
-- Branch: 35
-- Removes idx_notes_tags_gin from notes_memory_service.notes.
-- Migration 31 previously created this duplicate index; migration 06 and
-- migration 12 already own idx_notes_tags on the same column.
-- Existing databases where migration 31 ran keep the duplicate until this
-- migration applies. Fresh databases never receive it because migration 31
-- no longer creates it.

DROP INDEX IF EXISTS notes_memory_service.idx_notes_tags_gin;
