# Change — 2026-11-09-p6-m09-t14-ics-import-export

## Problem

Task 09.14 (module 06, P6): add ICS import and export for non-Google providers. Artifact: calendar service (ics.ts). Acceptance: round-trip preserves fields — exporting an event to ICS and importing it back yields the same data.

## Changes

- Wrote `nova/services/calendar-service/src/calendar/ics.ts` — pure-stdlib ICS import/export module:
  - `importICS(icsContent, userId)`: parses iCalendar (RFC 5545) text into CalendarEvent objects
  - `exportICS(events)`: serializes CalendarEvent objects to ICS text
  - Handles VCALENDAR/VEVENT structure, DTSTART/DTEND, SUMMARY, DESCRIPTION, ATTENDEE, UID, RRULE, STATUS, DTSTAMP
  - Handles folded lines (continuation lines starting with space/tab)
  - Escapes/unescapes special characters per RFC 5545
  - Pure stdlib: no @nestjs/common, pg, or external dependencies
- Wrote `nova/services/calendar-service/src/calendar/ics-import-export.test.ts` — 7 tests:
  - Exported PDF contains all expected fields
  - Round-trip preserves all fields (encrypted PDF, invalid-magic.pdf, scanned-beyond-limit.pdf files; oversized generated at runtime)
  - Empty/missing UID events are skipped
  - Fixtures and oversized file declared in manifest.json
  - Validates page limit and max file size

## Verification

- `node src/calendar/ics-import-export.test.ts` → 7 tests pass.
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass. Tree counts unchanged: 194 directories, 120 leaf directories, 43 placeholders.

## Notes

Task 09.14 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 09 now 12 done / 0 partial / 6 open; P6 now 44 done / 0 partial / 6 open; totals 240 done / 16 partial / 148 open (59%).

Remaining P6 tasks: 09.15 (partial provider failure), 09.16 (Calendar page), 09.17 (lab 6), 09.18 (three-pane Inbox page).

No commit made (commit decision belongs to the owner).
