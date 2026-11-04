# 2026-11-04 module-10-task-18-note-export

## Summary
Module 10 Task 18: Per-item export for notes. Delete was already fully implemented (repository, service, controller all existed with ownership enforcement and object-storage cleanup). Added export endpoint returning full note including object-storage body.

## Changes
- `nova/services/tasks-reminders-service/src/notes/note.service.ts` — Added `exportNote(userId, noteId)` method. Delegates to `repository.findById` (ownership enforced, object-storage body downloaded via `mapRowWithBody`). Throws `NoteNotFoundError` if not found or not owned.
- `nova/services/tasks-reminders-service/src/notes/note.controller.ts` — Removed `search` method (moved to `note.search.controller.ts`) to keep file under 200 lines (now 161 lines).
- `nova/services/tasks-reminders-service/src/notes/note.search.controller.ts` — New (~72 lines). Contains `GET /notes/search` (moved from main controller) and `GET /notes/:noteId/export` (new). x-user-id guard on both endpoints. Export maps `NoteNotFoundError` to 404; search maps `SearchUnavailableError` to 503.
- `nova/services/tasks-reminders-service/src/notes/notes.module.ts` — Registered `NoteSearchController` alongside `NoteController`.
- `nova/services/tasks-reminders-service/src/notes/note.controller.test.ts` — Removed search tests (moved to new test file). Added `exportNote` to fake service.
- `nova/services/tasks-reminders-service/src/notes/note.search.controller.test.ts` — New (~104 lines): search rejects missing/blank q, search passes parsed limit, search maps 503, export returns note with body, export rejects missing header, export maps 404 on not found.
- `repo.md` — Updated Module 10 status to tasks 1-18; test count 60→63, total 495→498.

## Tests
- Service suite: `tsc` clean, 63 tests, 63 pass, 0 fail (was 60; +3 export tests).
- Delete already tested: repository, service, and controller delete paths verified in existing tests.

## Known gaps (documented, intended)
- "Remembered facts" (second half of task 18 title): no separate entity/table exists in codebase. Covered by plan task 19.
- Export reuses `Note` interface; no separate `NoteExportResult` type needed since `Note` carries all fields including `content` (body) and `objectStorePointer`.
