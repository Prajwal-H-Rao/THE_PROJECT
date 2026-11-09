# Change — 2026-11-09-p6-m09-t16-calendar-page

## Problem

Task 09.16 (module 09, P6): build the Calendar page with agenda, week and
month views, a timezone indicator, and categories that pair colour with a
label (spec:405). Acceptance: each view keeps the timezone; no category
relies on colour alone; a write preview lists invitees and conflicts
(spec:408).

## Root cause

An earlier generated `page.tsx` had broken JSX nesting (mismatched
`</button>` for `<Button>`, unbalanced ternary parentheses), no default
export, and no test. The component did not parse, so the page could not
render as the locale calendar route.

## Changes

- Rewrote `nova/apps/web/app/[locale]/calendar/page.tsx` (193 lines):
  - One shared timezone state. All three views read it, so the timezone
    survives every view switch.
  - Agenda shows every event day; week shows only events starting within
    the next 7 days; month renders a 7-column day grid. The views differ.
  - Status and category render as text labels inside badges with mapped
    variants. Colour never encodes meaning alone (spec:279, spec:405).
    Category variants derive from a stable hash of the category name.
  - Event rows are real `<button>` elements, so selection is keyboard
    reachable (accessibility basic kept).
  - Selecting an event renders a write preview. It lists invitees and
    conflicts found by time-range overlap. It embeds `ActionPreview` for
    the approval grant (spec:408).
  - Exports `CalendarPage` as default for the Next route plus the named
    export for tests.
- Rewrote `nova/apps/web/app/[locale]/calendar/page.test.tsx` — 8 vitest
  tests, written against the component contract first:
  timezone kept across all view switches, status + category text labels,
  GMT+9 formatting, week-view distinctness (hides a far-future event),
  month grid, invitees + conflict listing, and `Conflicts: None` for a
  clear slot.
- Fixed `docs/plan/status.md` rows: module 09 now 16 done / 0 partial /
  2 open (matches its 18 build rows and the worklist), P6 now 46 done /
  2 open, P5 now 52 / 1 / 1 (its cells now sum to 54).

## Verification

- `npx vitest run app/[locale]/calendar/page.test.tsx` — 8/8 pass.
- `tsc --noEmit` — zero errors in the calendar files. Remaining errors
  are pre-existing in other files and out of scope.
- `npx vitest run components/ActionPreview.test.tsx
  tasks/calendar-view.test.tsx` — 9/9 pass. No regression.
- `python3 nova/tests/layout/check_layout.py` — all 28 checks pass.
  Counts stay 195 directories / 121 leaves / 43 placeholders; the
  `calendar/` directory already existed.
- `python3 nova/tests/layout/test_layout_checks.py` — every mutation was
  rejected by its check.

## Notes

Worklist: 09.16 ticked. P6 total row keeps 403 tasks / 240 done /
16 partial / 147 open because the phase sums now close. No commit made.
