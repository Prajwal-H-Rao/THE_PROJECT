# Change — 2026-11-09-p6-m09-t13-conflict-detection

## Problem

Task 09.13 (module 09, P6): implement event conflict detection against the provider. Artifact: calendar service. Acceptance: "Double booking surfaces." Spec:408 (calendar preview shows invitees and conflicts).

## Changes

- Added `detectConflicts(userId, startAt, endAt, excludeEventId?)` method to `CalendarEventRepository` in `nova/services/calendar-service/src/calendar.repository.ts`. Queries for existing events whose time range overlaps with the proposed time range (standard interval overlap: start1 < end2 AND start2 < end1), excluding the event being updated if excludeEventId is provided.
- Added `ConflictError` class and conflict check in `CalendarEventService.createCalendarEvent` in `nova/services/calendar-service/src/calendar.service.ts`. Before creating an event, calls `detectConflicts`; if any conflicts exist, rejects with a `ConflictError` describing the conflicting event.
- Wrote `nova/services/calendar-service/src/calendar/conflict-detection.test.ts` — stdlib test verifying:
  - Overlapping event is rejected
  - Non-overlapping event is accepted
  - Exact overlap is rejected
  - Back-to-back event (end == start of next) is allowed
  - Different users can have overlapping events (repository filters by userId)

## Verification

- `node src/calendar/conflict-detection.test.ts` → 5 tests pass.
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree counts unchanged: 194 directories, 120 leaf directories, 43 placeholders (no new directory added; `calendar/` already existed from task 09.11).

## Notes

Task 09.13 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 09 now 11 done / 0 partial / 7 open; P6 now 43 done / 0 partial / 7 open; totals 239 done / 16 partial / 148 open (59%).

Remaining P6 tasks: 09.14 (ICS import/export), 09.15 (partial provider failure), 09.16 (Calendar page), 09.17 (lab 6), 09.18 (three-pane Inbox page).

No commit made (commit decision belongs to the owner).
