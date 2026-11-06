# NOVA execution plan

This plan turns `docs/plan/status.md` into an ordered work queue. Give this file and `docs/plan/execution-phases.md` to the implementing model. The model works one task at a time, in phase order, until P11 passes.

## Read first

1. `repo.md` — project map.
2. `docs/plan/status.md` — current counts.
3. `docs/plan/order-and-constraints.md` — phase order and rules.
4. `docs/plan/execution-phases.md` — phase gates and work packages.
5. `docs/plan/worklist.md` and `docs/plan/worklist-p7-p11.md` — live task lists.
6. The module file that owns the task.

The spec is `NOVA_Full_Updated_Spec.md`. The spec wins on every conflict. Report a conflict. Do not follow the plan silently.

## Non-negotiable rules

1. Work one task per iteration. Do not batch tasks.
2. Write the test first. A test must fail before the code exists.
3. A task is done only when its test passes. Never mark a task done from inspection alone.
4. Do not commit and do not push. The owner commits.
5. Keep every file under 200 lines. Split a module when it grows.
6. Each module does one job. Each file gets a header comment. Each function gets a one-line purpose comment.
7. No `any` in TypeScript. Use an explicit type or an interface.
8. Use ASD-STE100 in code comments, docs, changelog entries and commit messages.
9. Never remove trust-boundary validation, error handling, security or accessibility.
10. Update both worklists, `docs/plan/status.md`, `repo.md` and `changes/` after each task.

## Task loop

Use this loop for every task.

1. Open the worklist for the current phase. Take the first unchecked task.
2. Open the module file. Read the task row and every `spec:LINE` it cites.
3. Write a test that proves the row's Test cell. Run it. Confirm that it fails.
4. Write the smallest code that passes the test.
5. Run the task test. Fix the code, not the test.
6. Run the full suite of the touched service or package.
7. Run the layout checks, the lint and the typecheck.
8. Update the checkbox. Update the module counts in `status.md`. Update the build status line in `repo.md`.
9. Add `changes/YYYY-MM-DD-p<phase>-m<module>-t<task>-<slug>.md`. Use the sections Problem, Changes, Verification, Notes.
10. Stop. Report the result and the next task.

If a command cannot run, record the exact error in the change file. Mark the task partial. Do not mark it done.

## Commands

| Scope | Command |
|---|---|
| Layout | `python nova/tests/layout/check_layout.py` |
| Layout self-test | `python nova/tests/layout/test_layout_checks.py` |
| Python lint | `ruff check .` |
| Python types | `mypy nova` |
| Contracts | `cd nova/packages/contracts && npm ci && npm test` |
| TypeScript service | `cd nova/services/<name> && npm ci && npm run build && npm test` |
| Web app | `cd nova/apps/web && npm ci && npm run build && npm test` |
| Document service | `cd nova/services/document-service && python -m pytest -q` |
| Red team | `python -m pytest nova/tests/red-team -q` |
| Model eval | `python -m pytest nova/tests/model-eval -q` |
| Compose suites | Copy the steps from `.github/workflows/ci.yml` |
| Lab | The command in `labs/registry.yaml` for that lab |

The README states that the local pip is broken. If a Python tool cannot run, record the error. Use the CI command as the reference.

## Path rules

- A new path under `nova/` needs an update to `nova/docs/layout-diff.md` and the allow-list in the layout checker.
- A new repo-root file needs a row in `nova/docs/layout-diff.md` and in `nova/tests/layout/record_paths.py`.
- Build output needs an entry in `nova/tests/layout/ignored_paths.py` and in `.gitignore`.
- Run the layout checks after every path change.

## Phase order and work packages

Read `docs/plan/execution-phases.md`. It holds the exit gate of each phase and the remaining work. Do not start a phase until the previous phase exit passes. The only exceptions are the interleave rules in `order-and-constraints.md`.

## Stop and ask

Stop and ask the owner when any of these is true:

1. A task needs a design decision that no design note records.
2. A task needs a new service, a new cross-service write or a destructive schema change.
3. A task needs a secret, a paid key or an external account.
4. A test fails for a reason outside the task.
5. A file cannot stay under 200 lines and no split is clear.
6. The spec and the plan disagree.
7. A claims-ledger row is stale.

Record the blocker in the change file. Do not invent a workaround.

## Progress

The two worklists are the live queue. `docs/plan/status.md` is the aggregate. `changes/` is the evidence log. `repo.md` is the project map.

Ask the owner before every commit.
