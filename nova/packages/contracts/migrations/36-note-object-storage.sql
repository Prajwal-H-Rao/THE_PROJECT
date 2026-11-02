-- Migration 36: Add object_store_pointer column to notes table.
-- Branches notes table so long bodies can live in object storage.
-- content becomes nullable so offloaded bodies store only a pointer.

ALTER TABLE notes_memory_service.notes
  ADD COLUMN object_store_pointer TEXT NULL;

ALTER TABLE notes_memory_service.notes
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE notes_memory_service.note_versions
  ALTER COLUMN content DROP NOT NULL;
