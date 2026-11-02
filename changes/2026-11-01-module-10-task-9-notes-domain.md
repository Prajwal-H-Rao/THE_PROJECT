# 2026-11-01 module-10-task-9-notes-domain

## Summary
Effort 6 — Module 10 task 9 (notes domain): fixed note repository ownership enforcement, added note service/controller/module with tests, and declared all note file paths in the plan.

## Changes
- `nova/services/tasks-reminders-service/src/notes/note.repository.ts` — Fixed ownership: `findById(userId, noteId)`, `update(userId, noteId, input)`, `delete(userId, noteId)` all userId-first; SQL `WHERE note_id = $2 AND user_id = $1` with `values = [userId, noteId]`; `update()` sets `created_by = userId` in note_versions insert (was `current.updatedAt`); header fixed to ASD-STE100 sentence; stays under 200 lines.
- `nova/services/tasks-reminders-service/src/notes/note.entity.ts` — Header fixed to ASD-STE100 sentence.
- `nova/services/tasks-reminders-service/src/notes/notes.module.ts` — New: NestJS module wiring NoteRepository, NoteService, NoteController; exports NoteService; header comment.
- `nova/services/tasks-reminders-service/src/notes/note.service.ts` — New: business layer wrapping repository; throws `NoteNotFoundError`/`NoteForbiddenError`; header comment; no `any`.
- `nova/services/tasks-reminders-service/src/notes/note.controller.ts` — New: REST endpoints with `x-user-id` header; maps `NoteNotFoundError` → `NotFoundException`; header comment; no `any`.
- `nova/services/tasks-reminders-service/src/notes/note.service.test.ts` — New: `node:test` tests, no `any`, ownership/cross-user assertions + header comment.
- `nova/services/tasks-reminders-service/src/notes/note.controller.test.ts` — New: `node:test` tests, no `any`, header enforcement assertions + header comment.
- `nova/services/tasks-reminders-service/src/app.module.ts` — Imported `NotesModule` and added to imports array.
- `docs/plan/10-tasks-notes.md` — Added plan rows 20-26 for all 7 note file paths (2 existing + 5 new) with `nova/` backtick prefixes inside the build-sequence table.
- `repo.md` — Added Module 10 task 9 status note.
- `changes/2026-11-01-module-10-task-9-notes-domain.md` — This entry.

## Tests
- `tsc --noEmit`: exit 0.
- `tsc` build: exit 0.
- `npm test`: 38 tests, 6 suites, 38 pass, 0 fail (was 28 tests, 4 suites — 10 new note tests added).
- All files under 200 lines with header comments; no `any`; ASD-STE100 throughout.

## Notes
- Step 1 fixes three ownership bugs: `findById` lacked `user_id` filter; `update` lacked `user_id` in WHERE and passed `current.updatedAt` as `created_by`; `delete` lacked `user_id` filter. All now mirror `task.repository.ts`.
- No external callers of note repository methods, so signature changes break nothing.
- `tree_checks`: note files declared via plan rows 20-26 with `nova/` backtick prefixes.
