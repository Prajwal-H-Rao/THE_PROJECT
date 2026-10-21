# 2026-10-21 — Strip the build timeline from the plan

## Goal

Remove the development timeline from `docs/plan/`. Keep the features, the order, and the constraints. The user reviews each implementation task and commits after each one.

## What changed

- Renamed `docs/plan/schedule.md` to `docs/plan/order-and-constraints.md`. It now holds only order and constraints: the nine phase-order rules, the external-gates table, the deferred-cloud section, the claims-ledger re-check rule, and the evaluation-metrics table.
- `docs/plan/order-and-constraints.md`: dropped the estimation basis, the totals table, the agent-leverage table, the spec-deadline arithmetic, the 40 h/week phase table, the spec roadmap mapping, and the slip trigger. Renamed the metrics column from `First measured` to `Owner phase`.
- `docs/plan/README.md`: dropped the `Window` column and the date range from the phase table. Dropped the lines that named hours and dates. Repointed readers to `order-and-constraints.md`.
- All 20 module files: dropped the `Hrs` column, the "sums to X hours" line, and the "At 40 hours per week" sentence. Kept the `Phase Pn.` line, the task rows, the build order, the acceptance tests, and the risks.
- `docs/plan/coverage.md`: the four rows that named `schedule.md` now name `README.md` or `order-and-constraints.md`.
- `docs/plan/claims-ledger.md`: the `Recheck before` dates stay as verification deadlines. The rule no longer ties them to a phase start.
- `repo.md`: the plan entry names `order-and-constraints`. Dropped the hour and date figures.

## Design decisions

- `schedule.md` was not deleted. It held the nine phase-order rules, the external gates, the cloud deferral, and the metric table. A plain delete lost that content.
- Phase labels P1 to P11 stay. They are dependency order, not calendar time.
- The claims-ledger dates stay. Staleness needs a calendar reference. They are verification deadlines, not a development schedule.
- The `Hrs` column went. Hours existed only to compute dates.
- The spec deadline stays in the spec. The plan no longer restates it.

## Verification

- Task count: 372 rows survive across the 20 module files.
- No file in `docs/plan/` holds a `2026-` or `2027-` date outside `claims-ledger.md`.
- No file in the repo names `schedule.md` outside `changes/`.
- The spec heading count still prints 74.
- Every plan file is under 200 lines.

## Note

The entry `2026-10-12-nova-build-plan.md` names `docs/plan/schedule.md`. That file is now `docs/plan/order-and-constraints.md`. The old entry is a record of a past change. It stays unchanged.
