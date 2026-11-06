# 2026-11-06 — plan status and execution documents

## Problem

The NOVA plan had no single status record. `docs/plan/README.md` stated 390 tasks. The module tables hold 406 rows and 403 unique task IDs. `repo.md` stated that modules 12 to 21 were complete, but the tree did not support that claim. An implementing model had no ordered queue and no definition of done.

## Changes

- `docs/plan/status.md` — reconciled status. Phase table, module detail, source conflicts, security flag, refresh commands. Baseline: 215 Done, 22 Partial, 166 Open, about 53 percent complete.
- `docs/plan/execution-plan.md` — rules, task loop, commands, path rules, stop conditions. 94 lines.
- `docs/plan/execution-phases.md` — phase gates and P1 to P11 work packages. 155 lines.
- `docs/plan/worklist.md` — live queue for P1 to P6. 75 lines.
- `docs/plan/worklist-p7-p11.md` — live queue for P7 to P11. 196 lines.
- `docs/plan/README.md` — links the new files. Notes that the 390 phase total is stale.
- `repo.md` — the build-status line now points to `docs/plan/status.md`. The plan file count is 30.
- `README.md` — task counts now state 403 unique task IDs.

## Verification

- `python3 nova/tests/layout/check_layout.py` — all 28 checks pass, exit 0. Tree: 182 directories, 112 leaf directories, 43 placeholders.
- `python3 nova/tests/layout/test_layout_checks.py` — every mutation rejected, exit 0.
- Line counts: `execution-plan.md` 94, `execution-phases.md` 155, `worklist.md` 75, `worklist-p7-p11.md` 196, `status.md` 91. All are under 200.
- The new documents cite no numeric spec line, so the citation checks do not change.

## Notes

- The split of `execution-plan.md` into two files came from the 200-line rule.
- Method: done means code plus a test or a changelog entry. Partial means code without proof. Open means no code.
- The counts come from the module tables, the `changes/` entries, and the `nova/` tree. No model response counted as proof.
- Security flag, not a code change: `nova/services/shell-service/src/shell.service.ts` runs arbitrary shell commands with `child_process.exec`. Remove it or add an allow-list before P9.
- Modules 08 and 10 repeat one task number. The unique count is 403, not 406.
- No commit was made.
