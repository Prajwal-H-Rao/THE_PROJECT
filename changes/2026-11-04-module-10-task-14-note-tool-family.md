# 2026-11-04 module-10-task-14-note-tool-family

## Summary
Module 10 Task 14: Register the note tool family in the MCP tool catalogue (create, search, read, link, summarise) with overwrite confirmation. Catalogue now loads cleanly; contracts test suite passes at 188 tests.

## Changes
- `nova/packages/contracts/mcp/catalogue/tasks.json` — Deleted. Was invalid JSON (JSDoc comment header before `{`), used non-canonical family `tasks`, and operation names `tasks.note.*` had two dots failing the one-dot name regex. `loadCatalogue` has no per-file try/catch, so this one file crashed catalogue loading at module load (grant-creation.ts calls it at import time). Nothing referenced `tasks.note.*` outside the file.
- `nova/packages/contracts/mcp/catalogue/notes_memory.json` — Added `confirm_overwrite: { "type": "boolean" }` to `notes_memory.create` arguments.schema.properties. Overwrite requires confirmation: callers must set `confirm_overwrite: true` to overwrite an existing note.
- `nova/packages/contracts/mcp/catalogue/notes_memory_extended.json` — New (~140 lines, under 200). Family `notes_memory` (canonical). Operations: `notes_memory.read`, `notes_memory.link` (with `confirm_overwrite`), `notes_memory.summarise`. One-dot names pass the name regex.
- `nova/packages/contracts/mcp/catalogue/catalogue-load.test.ts` — New test file (~100 lines): loadCatalogue succeeds on the real directory, all operations validate via validate_tool_definition, `confirm_overwrite` present in create and link schemas.
- `nova/packages/contracts/tsconfig.json` — Added `mcp/catalogue/catalogue-load.test.ts` to include.
- `nova/packages/contracts/package.json` — Added `dist/mcp/catalogue/catalogue-load.test.js` to the test script.
- `repo.md` — Updated Module 10 build status to tasks 1-14 done; updated contract test count 183 → 188, total 463 → 468.

## Tests
- Contracts suite: `tsc` clean, 188 tests, 188 pass, 0 fail (was 183; +5 catalogue-load tests).
- Catalogue loads without error; all operations across all 7 remaining catalogue files validate; confirm_overwrite present in notes_memory.create and notes_memory.link.

## Known gaps (documented, intended)
- `confirm_overwrite` is a schema declaration only; runtime enforcement (rejecting overwrite without `confirm_overwrite: true`) is service-layer logic outside task 14 scope.
- `summarise` is classification `read` so it never writes to the original note (satisfies "a summarise tool call never writes to the original note").
