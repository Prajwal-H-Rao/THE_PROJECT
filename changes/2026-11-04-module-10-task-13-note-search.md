# 2026-11-04 module-10-task-13-note-search

## Summary
Module 10 Task 13: note search with full-text first and vector as a rerank.
Search returns note IDs. Four negation rounds shaped the design before any code.

## Changes
- `nova/services/tasks-reminders-service/src/notes/note.search-vector.ts` — New. `NOTE_EMBEDDER` token, `NoteEmbedder` port, `parseVector` (pgvector text to number[]), `cosine`, 384-dim query-vector guard.
- `nova/services/tasks-reminders-service/src/notes/note.search.ts` — New. `NoteSearcher`:
  - Set A: inline rows ranked by `ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2))` — the exact migration-31 GIN expression, so the index applies.
  - Set B: offloaded bodies (pointer set, content NULL or empty). Chunked downloads (8 at a time). One miss or error skips only that note. `\u0000` stripped from bodies. One batch query: `unnest($1::text[]) WITH ORDINALITY`, same expressions and scale as set A. 1-based ordinality mapped with `Number(ord) - 1`.
  - Union dedup, A preferred. `normRank = rank / maxRank` with a zero guard (zero max keeps SQL order at score 0).
  - Rerank (JS only): valid 384-finite query vector; `cosine01 = (1+cos)/2` clamped; score `0.5*normRank + 0.5*cosine01`. Absent, unparsable, or dimension-mismatched embeddings stay neutral at `normRank`.
  - Limit coerced with `parseInt`, non-finite falls back to 20, clamped 1..100. Query text `\u0000` stripped. Blank query returns no rows.
- `nova/services/tasks-reminders-service/src/notes/note.entity.ts` — Added `NoteSearchResult` (`noteId`, `title`, `score`).
- `nova/services/tasks-reminders-service/src/notes/note.service.ts` — Optional `search` constructor param (keeps one-arg test sites valid). `searchNotes` delegates; throws `SearchUnavailableError` when unconfigured.
- `nova/services/tasks-reminders-service/src/notes/note.controller.ts` — `GET /notes/search?q=&limit=` declared before `@Get(":noteId")`. 400 on missing header or blank `q`. 503 on `SearchUnavailableError`.
- `nova/services/tasks-reminders-service/src/notes/notes.module.ts` — Registers `NoteSearcher` and `NOTE_EMBEDDER` (null). `OBJECT_STORE` token now exported from the object-storage module.
- `nova/services/tasks-reminders-service/src/notes/note.object-storage.ts` — Exports the `OBJECT_STORE` token.
- `nova/services/tasks-reminders-service/src/notes/note.repository.ts` — Fixed double-prefix bug: `create()` stored `` `obj://${key}` `` while `buildKey` already returns `obj://...`. Now stores the bare key, matching `update()`.
- `docs/plan/10-tasks-notes.md` — Row 13 wording unchanged; rerank conformance reached.

## Tests
- `note.search.test.ts` (new, 9 cases, with shared fake pool `note.search.fakes.ts`): note IDs + user filter + exact indexed expression; rerank reorder on pgvector strings; degrade on absent/throwing/dim-mismatched embedder; malformed embedding keeps pure text score; offloaded-body batch finds long notes and skips download misses; no-match bodies return none; limit fallback/clamp/slice, blank query, NUL strip; zero-rank SQL order; service delegation and unconfigured error.
- `note.controller.test.ts` — 3 new cases: blank/missing q 400, limit passthrough with NaN passthrough, 503 mapping.
- `note.repository.object-storage.test.ts` — Regression: `create()` must bind the bare uploaded key; download of the bound pointer must return the body.
- Service suite: `tsc` clean, 57 tests, 57 pass, 0 fail.

## Known gaps (documented, intended)
- Rerank ships disabled: `NOTE_EMBEDDER` is null until plan row 12 wires the ML adapter. The adapter must wrap the batch `MLServiceClient.embed` (catch throws, check array and 384 length) to fit the port.
- No `is_archived` filter; title is not matched (the GIN index is content-only).
- Legacy rows with `obj://obj://` pointers stay unsearchable. A repair UPDATE is a separate decision.
- `restoreVersion` still leaves a stale pointer when a note shrinks; Set B's content guard neutralizes it for search, but the restore path itself needs its own fix.
