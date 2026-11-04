# 2026-11-04 module-10-task-15-tasks-notes-page

## Summary
Module 10 Task 15: Tasks and Notes web page. Builds the Tasks and Notes page with list, board, calendar, and notes views over real data from the backend API.

## Changes
- `nova/apps/web/lib/api-types.ts` — New (~64 lines). TypeScript interfaces for Task and Note API responses, matching the backend service contracts.
- `nova/apps/web/lib/api-client.ts` — New (~46 lines). Fetch client for GET /tasks and GET /notes endpoints. Base URL and user id from NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_USER_ID env vars with sensible defaults.
- `nova/apps/web/app/[locale]/tasks/page.tsx` — New (~120 lines). Main Tasks and Notes page using Shell component. Fetches tasks and notes on mount, renders tab views (list/board/calendar/notes), shows overdue task count, handles loading/empty/error states. All text from props, no hardcoded sample data.
- `nova/apps/web/tasks/task-list.tsx` — New (~70 lines). Task list view using TaskCard components. Shows overdue state for tasks past due date. Empty state when no tasks.
- `nova/apps/web/tasks/task-board.tsx` — New (~75 lines). Board view grouping tasks by status (open/in_progress/done/cancelled) in columns.
- `nova/apps/web/tasks/note-list.tsx` — New (~80 lines). Notes list view using NoteCard components with tag badges. Empty state when no notes.
- `nova/apps/web/tasks/calendar-view.tsx` — New (~85 lines). Calendar view grouping tasks by due date. Shows overdue header for past dates. Empty state when no dated tasks.
- `nova/apps/web/shell/shell.tsx` — Modified. Added onItemClick prop to Shell, passed through to ShellNav.
- `nova/apps/web/app/[locale]/tasks/page.tsx` — Uses Shell with navItems (Tasks) and onItemClick handler using next/navigation router.
- `nova/apps/web/messages/en.json` — Modified. Added "tasks" namespace with title, tab labels, empty states, overdue, loading, error strings.
- `nova/apps/web/vitest.config.ts` — New. Vitest config with happy-dom environment and @/ alias resolution.
- `nova/apps/web/test-setup.ts` — New. Empty vitest setup file.
- `nova/apps/web/package.json` — Modified. Added @testing-library/react and @testing-library/jest-dom dev dependencies, happy-dom dev dependency.

## Tests
- `nova/apps/web/tasks/task-list.test.tsx` — 3 tests: renders tasks from real data, empty state, overdue task state.
- `nova/apps/web/tasks/task-board.test.tsx` — 2 tests: groups tasks by status, empty state.
- `nova/apps/web/tasks/note-list.test.tsx` — 2 tests: renders notes with tags, empty state.
- `nova/apps/web/tasks/calendar-view.test.tsx` — 2 tests: groups tasks by due date, empty state when no dated tasks.
- Web app test suite: `tsc` clean, 21 tests pass (11 existing token tests + 10 new tasks/notes tests).

## Known gaps (documented, intended)
- Backend URL and user id come from env vars (NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_USER_ID). Must be set for live data fetching.
- No auth system in frontend - user id is a static env var value.
- Web app test count not added to the NestJS service test count in repo.md (different test runners).
