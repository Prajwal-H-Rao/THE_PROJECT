# 2026-11-06 — remove shell-service (resolve shell blocker)

## Problem

`nova/services/shell-service/src/shell.service.ts` ran `child_process.exec` on a free-form string. The NOVA spec deny-list (`NOVA_Full_Updated_Spec.md:212`) forbids arbitrary shell/process-execution tools, and the plan flagged the service as a blocker before P9. No repo code imported it, and no compose, CI, or workspace config referenced it. It was not one of the 23 catalogue services.

## Changes

- Deleted `nova/services/shell-service/` (7 files: `nest-cli.json`, `package.json`, `tsconfig.json`, `src/main.ts`, `src/app.module.ts`, `src/shell.module.ts`, `src/shell.service.ts`). Removed 2 directories and 1 leaf directory.
- `nova/tests/layout/tree_checks.py`: removed `services/shell-service` from `EXTRA_DIRECTORY_PREFIXES`; `EXPECTED_DIRECTORIES` 182 → 180; `EXPECTED_LEAVES` 112 → 111; `EXPECTED_PLACEHOLDERS` stays 43.
- `nova/tests/layout/record_mutations.py`: `wrong_leaf_count` re-pointed from 112→111 to 111→112 so the mutation still makes check M fail.
- `nova/docs/layout-diff.md`: counts updated to 180 directories and 111 leaf directories at all five sites (lines 5, 37, 59, 61, 65); `services/shell-service` removed from the service directory allow-list on line 37.
- `repo.md`: tree counts updated (line 24, line 93); allow-list prefix count 20 → 19 (line 97).
- `docs/handover-tests.md` line 16 and `docs/implementation/approach-P1.md` line 22: counts 182/112/43 → 180/111/43.
- `docs/handover-services.md` line 84: removed `shell-service` from the empty-service list.
- `docs/plan/status.md` line 72: security flag replaced with a removal statement citing `NOVA_Full_Updated_Spec.md:212`.

## Verification

- `python3 nova/tests/layout/check_layout.py` — all 28 checks pass, exit 0. Tree: 180 directories, 111 leaf directories, 43 placeholders.
- `python3 nova/tests/layout/test_layout_checks.py` — every mutation rejected, exit 0.
- No `shell-service` reference remains outside historical changelogs and the status removal statement.
- Real post-deletion counts confirmed by walking the tree: 180 directories, 111 leaves, 43 placeholders.

## Notes

- Historical `changes/2026-11-04-*` entries keep their 182/112/43 references because they describe the tree state at the time those changes were made.
- The earlier `changes/2026-11-06-plan-status-and-execution.md` entry remains as the record of the plan-doc work; this entry records the blocker fix.
- No commit was made.
