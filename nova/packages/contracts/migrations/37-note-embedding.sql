-- Migration 37: Add embedding column to notes table.
-- Adds vector column for semantic search via embeddings.

ALTER TABLE notes_memory_service.notes
  ADD COLUMN embedding vector(384);  -- all-MiniLM-L6-v2 produces 384-dimensional vectors

CREATE INDEX idx_notes_embedding ON notes_memory_service.notes
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);