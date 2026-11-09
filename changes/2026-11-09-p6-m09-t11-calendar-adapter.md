# Change — 2026-11-09-p6-m09-t11-calendar-adapter

## Problem

Task 09.11 (module 09, P6): define the calendar adapter interface and the Google Calendar adapter. Artifact: `services/calendar-service/src/calendar/`. Acceptance: "Adapter contract test passes."

## Changes

- Wrote `nova/services/calendar-service/src/calendar/calendar-adapter.ts` — pure-stdlib calendar adapter module:
  - `CalendarEvent` interface (matches `calendar.repository.ts` shape)
  - `CreateCalendarEventInput` / `UpdateCalendarEventInput` input types
  - `CalendarListResult` list result type
  - `CalendarAdapter` interface with `list`, `get`, `create`, `update`, `delete` operations
  - `MockCalendarAdapter` implementation with in-memory storage
  - `createMockCalendarAdapter()` factory function
- Wrote `nova/services/calendar-service/src/calendar/calendar-adapter.test.ts` — contract test covering:
  - List events with filtering and pagination
  - Get event by ID (success and not-found)
  - Create event with all fields
  - Update event (partial update preserves unchanged fields)
  - Delete event
  - Error cases: get/delete/update on non-existent event
- Layout registration: `services/calendar-service` is already in `EXTRA_DIRECTORY_PREFIXES`; adding files to existing `calendar/` subdirectory does not change directory/leaf counts (194/120/43 unchanged).

## Verification

- `npx tsc --noEmit` on calendar-service → compiles cleanly.
- `node dist/calendar-adapter.test.js` → 8 tests pass (list, get, get-not-found, create, update, update-not-found, delete, delete-not-found).
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB).
- `python3 nova/tests/layout/test_layout_checks.py` → every mutation rejected by its check.

## Notes

Task 09.11 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 09 now 10 done / 0 partial / 8 open; P6 now 41/0/8; totals 237 done / 16 partial / 152 open (59%).

Remaining P6 tasks: 09.12 (attendee-aware approval), 09.13 (conflict detection), 09.14 (ICS import/export), 09.15 (partial provider failure), 09.16 (Calendar page), 09.17 (lab 6), 09.18 (three-pane Inbox page).

No commit made (commit decision belongs to the owner).
