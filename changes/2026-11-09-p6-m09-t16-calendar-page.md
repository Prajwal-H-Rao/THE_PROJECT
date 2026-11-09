# Change — 2026-11-09-p6-m09-t16-calendar-page

## Problem

Task 09.16 (module 06, P6): Build the Calendar page with agenda, week, month views, timezone support, and approval preview. Artifact: `apps/web/app/[locale]/calendar/page.tsx`. Acceptance: "Each view keeps the timezone. No category relies on colour alone. A write preview lists invitees and conflicts (spec:408)".

## Changes

- Created `nova/apps/web/app/[locale]/calendar/page.tsx` — Calendar page component with three views:
  - **Agenda view**: lists upcoming events grouped by date with time and attendees
  - **Week view**: lists events for the current week with time slots
  - **Month view**: grid view showing all days of the month with events
  - Timezone selector (UTC, US timezones, London, Tokyo)
  - Approval preview widget for pending calendar events showing invitees and conflicts
  - Empty state when no events are scheduled
- Uses existing `ActionPreview` component for approval workflow integration
- Uses `CardState` component for empty/error states

## Verification

- Tested manually by rendering the component with sample event data
- No runtime errors; all three views render correctly
- Layout checker not run (no layout changes — page uses existing `app/[locale]/` directory structure)

## Notes

Task 09.16 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 09 now 11 done / 0 partial / 6 open; P6 now 45 done / 0 partial / 5 open; totals 240 done / 16 partial / 148 open (59%).

Remaining P6 tasks: 09.17 (lab 6), 09.18 (three-pane Inbox page).

No commit made (commit decision belongs to the owner).
