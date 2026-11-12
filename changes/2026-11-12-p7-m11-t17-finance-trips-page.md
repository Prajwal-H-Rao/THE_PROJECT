# 2026-11-12 — P7 module 11 task 11.17: Finance and Trips page

## What changed

Task 11.17 ("Build the Finance and Trips page", `docs/plan/11-finance-trips.md:37`) is implemented in `nova/apps/web/app/[locale]/finance/`.

New files:

- `page.tsx` — Main page (141 lines). Shell-free layout following the calendar page pattern: receives data via props for testability. Period selector (start/end date inputs), deterministic finance summary computed in integer minor units (spec:826), empty state when no data.
- `components/summary-cards.tsx` (55 lines) — Net and cash-flow cards. Formats minor units as currency strings. Cash flow coloured positive/negative. Estimate disclaimer per spec:411.
- `components/category-chart.tsx` (83 lines) — Div-based horizontal bar chart of spending by category. No canvas/SVG library dependency. Bars labelled with category name and amount (not colour alone, spec:279). Values in integer minor units.
- `components/import-provenance.tsx` (62 lines) — DataTable of every import with source, reference, date, merchant, category, amount. Every import shows its provenance.
- `components/review-queue.tsx` (67 lines) — Surfaces uncertain rows (category confidence < 0.7) for manual review. High-confidence rows excluded (task 11.8 pattern).
- `components/trip-map.tsx` (79 lines) — SVG-based route map: stops as connected points with labels. Alternating above/below line layout. No external map library.
- `components/trips-section.tsx` (96 lines) — Trips section: per-trip card with title, status, date range, route timeline (Timeline component), route estimate label, booking links between stops carrying estimate labels (spec:411). No money movement (spec:190): booking links navigate only, no purchase executes.
- `page.test.tsx` (159 lines) — 10 vitest tests: page title and period selector, net/cash-flow cards with deterministic totals, category chart from stored transactions, import provenance with source/reference, review queue surfaces uncertain rows (40% confidence), high-confidence rows excluded, trips section with map and stops, booking links with estimate labels, empty state, period filtering.

Modified files:

- `nova/apps/web/lib/api-types.ts` — Added `FinanceTransaction` (mirroring finance-service entity), `Trip`, `TripStop`, `FinanceSummary`, `TransportOption` types.
- `nova/apps/web/lib/api-client.ts` — Added `fetchTransactions`, `fetchTrips` functions.
- `nova/tests/layout/tree_checks.py` — EXPECTED_DIRECTORIES 200→202, EXPECTED_LEAVES 126→127 (new finance/ and finance/components/ directories).
- `nova/tests/layout/record_mutations.py` — wrong_leaf_count mutation updated 127→128.
- `nova/docs/layout-diff.md` — Scope section tree counts updated 200→202, 126→127.
- `repo.md` — Verified tree counts and P7 status updated.
- `docs/plan/status.md` — Module 11 row (17 done, 0 partial, 1 open), P7 phase row (94%), total row.
- `docs/plan/worklist-p7-p11.md` — 11.17 ticked.

## Proof

- `npx vitest run` over web app: 62 tests pass, all 10 new finance page tests pass. 2 pre-existing e2e Playwright test files fail (need a running server; pre-existing).
- `python3 nova/tests/layout/check_layout.py`: all checks pass.
- `python3 nova/tests/layout/test_layout_checks.py`: every mutation case rejected.

## Negation loop

Two subagents signed off across two rounds. Round 1 blockers: wrong directory path (`apps/web/` vs `nova/apps/web/`), non-existent `/transactions`/`/trips` endpoints causing runtime 404s, single page file exceeding 200-line limit, no map library/component, missing spec:411 estimate labels on booking links, types not mirroring service entities, ambiguous Shell usage. Round 2 confirmed all resolved: correct paths, props pattern avoids 404, split into 7 sub-components each under 200 lines, SVG map component, estimate labels on booking links, types mirror service entities, Shell-free layout (calendar page pattern). Both negators: "no blocking objections. The approach is sound."

## Doc updates

- `docs/plan/status.md`, `docs/plan/worklist-p7-p11.md`, `repo.md` updated.
- `nova/docs/layout-diff.md` tree counts updated.
- Changelog entry created.

## Not done here

- 11.18 (register trips operations with policy) stays open.
