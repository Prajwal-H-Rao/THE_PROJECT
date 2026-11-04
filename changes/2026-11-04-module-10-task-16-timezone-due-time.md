# 2026-11-04 module-10-task-16-timezone-due-time

## Summary
Module 10 Task 16: Timezone-safe due-time handling for task recurrence.
Recurrence now computes next occurrences in the task's stored IANA time zone
with correct DST semantics (gap forward, ambiguity earliest).

## Changes
- `nova/services/tasks-reminders-service/src/tasks/timezone.ts` — New (~100 lines).
  - `LocalComponents` interface (year/month/day/hour/minute/second).
  - `toLocalComponents(utcMs, timezone)` via Intl.DateTimeFormat formatToParts.
  - `toUTC(components, timezone)` — scans a 30-hour window around midnight UTC
    of the target local date. Exact match when the local time exists (earliest
    UTC instant for DST ambiguity). DST gap maps forward to the first valid
    instant after the gap. Fallback treats components as UTC.
  - `validateTimezone(timezone)` — catches RangeError from Intl for invalid IANA names.
- `nova/services/tasks-reminders-service/src/tasks/recurrence-service.ts` — Rewritten (~195 lines).
  - All interval arithmetic, BYDAY/BYMONTH/BYMONTHDAY matching, and UNTIL comparison
    operate on LocalComponents in the task's zone.
  - UNTIL is a DATE, inclusive through end of day (year/month/day comparison only).
  - Invalid timezone returns structured `{code: "invalid_timezone"}` error.
  - Invalid start date returns structured `{code: "invalid_start_date"}` error.
  - UTC behavior identical to before (all 8 existing tests pass unchanged).
- `nova/services/tasks-reminders-service/src/tasks/recurrence-service.test.ts` — +3 tests:
  - spring-forward gap (2:30 AM doesn't exist on 2026-03-08 in America/New_York → maps to 3:00 AM EDT)
  - fall-back ambiguity (1:30 AM occurs twice on 2026-11-01 → earliest UTC instant)
  - invalid timezone → structured error
- `repo.md` — Updated Module 10 status to tasks 1-16; test count 57→60, total 468→471.

## Tests
- Service suite: `tsc` clean, 60 tests, 60 pass, 0 fail (was 57; +3 DST/timezone tests).
- All 8 existing UTC tests pass unchanged.

## Known gaps (documented, intended)
- `startDate` strings without a "Z" suffix parse as system local time via `new Date()` — pre-existing behavior, all tests use "Z".
- `addMonths`/`addYears` clamp day-of-month to month end (e.g., Jan 31 + 1 month → Feb 28).
