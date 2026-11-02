# NEGATOR REPORT — Approach (Effort 5 v2)

**Verdict: BLOCKED** — the core remediation path does not work on existing databases. Do not proceed as written.

Method: read working-tree files, `git show HEAD`, `git log`, `git status`, ran `python3 nova/tests/layout/check_layout.py` and `test_layout_checks.py`, read `nova/tests/layout/tree_checks.py`, `plan_index.py`, `check_layout.py`, `record_paths.py`, `runner.ts`, `runner.test.ts`, `ci.yml`, `02-data-and-audit.md`, `repo.md`, `AGENT_CONFIG.md`, `AGENTS.md`.

---

## 1. Schema drift: migration 35 drops the index from the wrong schema (BLOCKING)

Files: `nova/packages/contracts/migrations/31-notes-fulltext.sql` (lines 10-11), proposed `nova/packages/contracts/migrations/35-drop-duplicate-tags-index.sql`.

- Migration 31 lines 10-11: `CREATE INDEX idx_notes_tags_gin ON notes_memory_service.notes USING GIN (tags);`. The index name `idx_notes_tags_gin` is unqualified. PostgreSQL creates an unqualified index in the current schema (first entry of `search_path`), not in the table's schema (`notes_memory_service`). No migration sets `search_path` (verified: no `search_path` or `SET schema` under `nova/packages/contracts/migrations/`). So the index lands in the connecting user's schema (typically `$user`/`public`), not `notes_memory_service`.
- Proposed migration 35: `DROP INDEX IF EXISTS notes_memory_service.idx_notes_tags_gin;`. This looks for `idx_notes_tags_gin` in schema `notes_memory_service`.
- On an existing database where migration 31 already ran, `idx_notes_tags_gin` exists in the current schema, not `notes_memory_service`. Migration 35 looks in `notes_memory_service`, finds nothing, and — because of `IF EXISTS` — emits only a NOTICE and succeeds without dropping anything. The duplicate `idx_notes_tags_gin` persists. Remediation fails exactly where it is supposed to work.

## 2. Silent no-op: no signal that remediation failed (BLOCKING)

File: proposed `nova/packages/contracts/migrations/35-drop-duplicate-tags-index.sql`.

- `DROP INDEX ... IF EXISTS` never raises an error when the index is absent or in another schema. It only emits a NOTICE. A run of migration 35 reports success whether or not it actually removed `idx_notes_tags_gin`. The approach gives no verification step (no `SELECT` against `pg_indexes`, no assert) to confirm the duplicate was removed. This is a silent no-op, which the project rules flag as unacceptable.

## 3. The approach's central premise is false

The approach states migration 35 "remediates existing databases where migration 31 was already applied." Because of objection #1, migration 35 does not remove the index that migration 31 created on existing databases. The premise is false; remediation does not occur.

---

## Verified: these approach claims hold (not objections)

- tree_checks `is_owned`: migration 35 at `packages/contracts/migrations/35-...` IS owned via plan 02 task 1 backtick `packages/contracts/migrations/` (prefix match `relative.startswith(path + "/")`). `docs/plan/02-data-and-audit.md:24`. Claim #3 is correct.
- `DROP INDEX IF EXISTS schema.index` without `ON table` IS valid PostgreSQL syntax. Claim #2 syntax is correct.
- Migration 31 IS tracked in HEAD (commit 5365442; `git show HEAD:` matches working tree). Claim #1 correct.
- Both files are under 200 lines with header comments. ASD-STE100 fine. No line-count or header violation.
- The migration runner keys `_migrations` by full filename (`runner.ts:58-59`), so migration 35 records cleanly; `runner.test.ts` uses a temp dir and is unaffected.
- Layout check X (extra paths) compares expected vs stated groups, not actual tree files, so migration 35 does not break it.

---

## Required fix direction (not implemented here)

To make migration 35 actually remove the index on existing databases, creation and drop must target the same schema. Options: (a) schema-qualify the index at creation in migration 31 and match it in migration 35 — but migration 31 is being edited to remove the index entirely, so this only matters for existing databases where 31 already ran unqualified; (b) run migration 35 with an explicit `search_path`/`SET schema` pointing at the schema where migration 31 placed the index; (c) add a verification step that queries `pg_indexes` and fails if `idx_notes_tags_gin` still exists. Since migration 31 removes the index for fresh databases, migration 35 only matters for existing databases, and there it must target the schema where the index actually lives.
