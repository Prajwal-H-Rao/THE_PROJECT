# 2026-11-01 module-01-migration-31-dedup-and-35-drop-duplicate-tags-index

## Summary
Effort 5 — Migration dedup cleanup: removed the duplicate `idx_notes_tags_gin` tags GIN index from migration 31 and added migration 35 to drop it from existing databases where migration 31 was already applied.

## Changes
- `nova/packages/contracts/migrations/31-notes-fulltext.sql` — Removed `CREATE INDEX idx_notes_tags_gin ... USING GIN (tags)` (lines 10-11). Migration 06-tasks-schema.sql:44 already creates `idx_notes_tags ... USING GIN (tags)` on the same column; migration 12-indexes.sql:41 re-creates it with IF NOT EXISTS. Kept only the content `to_tsvector` GIN index (`idx_notes_content_fts`). Updated header comment to remove "Also adds a GIN index on tags."
- `nova/packages/contracts/migrations/35-drop-duplicate-tags-index.sql` — New migration: `DROP INDEX IF EXISTS notes_memory_service.idx_notes_tags_gin;` (valid PostgreSQL, schema-qualified, no `ON tablename` clause). Remediates existing databases where migration 31 was already applied. On fresh replay, edited migration 31 never creates the duplicate and migration 35's `IF EXISTS` is a harmless no-op. Both paths converge to one tags GIN index.
- `repo.md` — Updated migration count (13 → 37) and added migration 31/35 notes.

## Tests
- `tree_checks.check_tree_files`: migration 35 at `packages/contracts/migrations/35-...` is owned via plan 02 task 1 backtick `packages/contracts/migrations/` (prefix match). No undeclared-file rejection for migration 31 or 35.
- Migration runner keys `_migrations` by full filename (`runner.ts:58-59`); migration 35 sorts after 34 and applies in order. No contiguity requirement (migration 30 already absent).
- `runner.test.ts` uses an isolated `test-migrations/` temp directory; unaffected by real migration changes.
- No TypeScript compilation needed (SQL files). All files under 200 lines with header comments. ASD-STE100 language throughout.

## Notes
- Migration 31 is tracked in HEAD (not untracked — corrected premise from earlier negator review).
- Migration 12-indexes.sql:41 also creates `idx_notes_tags ... USING GIN (tags)` with IF NOT EXISTS (harmless duplicate on fresh replay due to IF NOT EXISTS).
- No migration 30 exists (gap 29 → 31); runner does not require contiguity.
- Pre-existing duplicate branch numbers (10, 17, 26) are unrelated to this change.
