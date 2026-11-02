# Negator Report v6 — Module 10 Task 9 (notes domain) — v3 approach

## Role

Independent negator. Goal: prove the v3 approach WRONG. Report blocking objections with specific file paths. Object only if the approach leaves a flaw unfixed, introduces a new flaw, or violates project rules. Do not object to flaws the steps explicitly fix.

## Ground truth verified against the working tree

- `note.repository.ts` is 187 lines. Current `findById(noteId)`, `update(noteId, input)`, `delete(noteId)` take NO userId. Current SQL: `WHERE note_id = $1` (findById/delete) and `WHERE note_id = $1` (update), values `[noteId]`. No ownership enforcement.
- `note.repository.ts` line 82 calls `this.findById(noteId)` internally with one argument.
- `note.entity.ts` header already reads `Represents one user-owned note.` — one ASD-STE100 sentence.
- No external callers of note repo methods exist (grep across `nova/services/tasks-reminders-service/src` confirms only internal use).
- `app.module.ts` line 21: `imports: [TasksModule]`. `PG_POOL` is `@Global()` and exported, so `NotesModule` can inject it with no extra imports.
- `check_tree_files` check P currently FAILS and lists `services/tasks-reminders-service/src/notes/note.entity.ts` and `note.repository.ts` as undeclared. No plan module declares `services/tasks-reminders-service/src/notes/*`.
- Migration 06 creates `notes_memory_service.notes` with `user_id`. Migration 33 creates `notes_memory_service.note_versions` with `created_by TEXT NOT NULL`.
- `package.json` test script: `node --test dist/**/*.test.js`. Shell glob without globstar matches one directory level (`dist/tasks/*.test.js` confirmed). Notes tests are one level deep under `dist/notes/`, so they will be discovered.
- `tsc --noEmit` baseline passes (exit 0). `tsc` bin exists at `node_modules/.bin/tsc`. `dist/` exists and is gitignored; `tsc` does NOT delete stale `outDir` files. `dist/notes/` already contains stale `note-link.*`, `note.service.js`, `notes.module.js` whose sources are absent from `src/notes/`.
- `plan_index.owned_path` strips a leading `nova/` from backtick tokens, so `nova/...` prefixes in plan rows map to tree-relative paths and satisfy `is_owned`.

## Blocking objection

### Objection 1 — `note.repository.ts`: `findById` and `delete` specify SQL parameter order but not the `values` array, risking a bind mismatch that silently breaks ownership

File: `nova/services/tasks-reminders-service/src/notes/note.repository.ts`

The approach states for `findById(userId, noteId)` and `delete(userId, noteId)` the SQL `WHERE note_id = $2 AND user_id = $1` with userId first. That binds `$1 = userId` and `$2 = noteId`, so `values` MUST be `[userId, noteId]`.

However, the approach explicitly gives `values = [userId, noteId]` only for `update`. For `findById` and `delete` it states the SQL clause but NOT the `values` array. This is an inconsistency and a concrete risk:

- Current `delete` uses `values = [noteId]` with note_id as `$1`.
- Current `findById` uses `values = [noteId]` with note_id as `$1`.

If an implementer preserves that existing ordering (`values = [noteId, userId]`) while applying the approach's SQL `WHERE note_id = $2 AND user_id = $1`, then `$1` receives `noteId` and `$2` receives `userId`. The SQL then compares `note_id = <userId value> AND user_id = <noteId value>`.

Consequence: ownership enforcement is silently inverted or nullified. A cross-user read/delete can match the wrong row, or operations return empty for the real owner. Since the entire purpose of step 1 is ownership enforcement, a bind mismatch defeats the fix and is a security-relevant flaw.

This is a blocking objection. The approach must explicitly pin `values = [userId, noteId]` for both `findById` and `delete` (mirroring how it already pins them for `update`), OR reorder the SQL placeholders to match a stated values array.

Affected lines: `findById` (currently lines 40-49) and `delete` (currently lines 160-169) of `note.repository.ts`.

## Non-blocking observations (not objections)

- Step 2 (`note.entity.ts` header) is a no-op: the header already holds one ASD-STE100 sentence (`Represents one user-owned note.`). Nothing is broken; nothing is introduced.
- Step 9 verification order (`tsc --noEmit`, `tsc`, `npm test`) is correct and sufficient for the code itself. It does not run the layout checker, but `check P` failures on non-note files (analytics, calendar, etc.) pre-exist and are not introduced by this approach.
- Step 8 plan rows with `nova/` backtick prefixes correctly declare the 7 note file paths; `owned_path` strips the prefix, so `check_tree_files` will own them.

## Conclusion

The approach is unsound as written because Objection 1 leaves a bind-mismatch risk in `note.repository.ts` `findById` and `delete` that silently breaks ownership. Fix: state `values = [userId, noteId]` for both methods (and keep `$1=userId, $2=noteId` in the SQL), matching the explicit `values` already given for `update`. No other blocking objection found.
