# 2026-11-12 — P7 module 11 task 11.15: itinerary, packing list, checklist

## What changed

Task 11.15 ("Implement itinerary draft, packing list and a pre-departure checklist", `docs/plan/11-finance-trips.md:35`) is implemented in `nova/services/trips-service/`.

New files:

- `src/types.ts` — shared `TripPlan`/`TripInstant` types, shaped from the trips table in migration 08.
- `src/civil.ts` — civil calendar helpers. Instants convert to local civil dates via `Intl.DateTimeFormat` in the trip timezone; day enumeration and offset math run on civil Y/M/D values only, so DST transitions cannot drop or shift a day. Invalid timezone falls back to UTC deterministically. Offset-less ISO strings are rejected with a fixed `RangeError` because their parse is host-timezone dependent.
- `src/itinerary.ts` — `draftItinerary`: one entry per local calendar day, arrival mark on the first day, departure mark on the last, both marks on a one-day trip. Every entry carries `estimateLabel: "estimated"` (spec:411).
- `src/packing.ts` — `buildPackingList`: base items always present; clothing quantities scale one-per-day up to fixed caps; extras appear at fixed day-count thresholds.
- `src/checklist.ts` — `buildPreDepartureChecklist`: six items with a phase (weeks-before / days-before / day-of) and a due date from civil-day subtraction against the start date. Draft items are always not-done. No clock reads.
- `src/fixtures.ts` — shared `BASE_TRIP` test fixture.
- `src/itinerary.test.ts`, `src/packing.test.ts`, `src/checklist.test.ts` — 19 tests, written first and confirmed failing. They pin: determinism (`deepStrictEqual` on repeated calls) for all three builders; the estimate label on every day; the one-day clamp for `endAt <= startAt`; the Asia/Kolkata two-calendar-day case; DST fall-back and spring-forward day lists; the DST-safe civil checklist offset (`2026-10-25`, not the epoch-subtraction `2026-10-26`); the offset-less string rejection; `Date`/epoch-ms input equivalence; the 365-day trip cap; packing caps.

## Proof

- `node --test` over the four trips-service test files: 25 tests, all pass (19 new; 6 pre-existing estimation tests untouched).
- `python3 nova/tests/layout/check_layout.py`: all checks pass.
- `python3 nova/tests/layout/test_layout_checks.py`: every mutation case rejected.
- Ruff and mypy are not installed in this environment; no Python files changed.
- `src/mcp/server.test.ts` fails on the clean tree too (imports a built `server.js`); pre-existing, not touched.

## Negation loop

Three revisions across four rounds. Round 1 blockers: missing estimate label (spec:411), timezone-unaware day math, unspecified degenerate ranges. Round 2 blocker: unpinned input time representation. Round 3 blocker: the pinned timezone test did not discriminate (instants spanned two UTC days too). Round 4 blocker: DST mechanism unpinned against epoch-ms stepping. Final round: both negators returned "no blocking objections". Fix record: civil-arithmetic mechanism plus pinned fall-back, spring-forward, Kolkata and checklist-offset tests.

## Doc updates

- `docs/plan/status.md` — module 11 row (15 done, 1 partial, 2 open), P7 phase row (83%), total row (255 done, 133 open).
- `docs/plan/worklist-p7-p11.md` — 11.15 ticked.
- `repo.md` — status line updated.

## Not done here

- 11.16 (booking behind an approval grant), 11.17 (Finance and Trips page), 11.18 (register trips operations with policy) stay open.
