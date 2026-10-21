# 2026-10-21 — Strengthen the layout checker

## Goal

Prove more of the record. The checker must reject a record that drifts from the tree, the plan, or the sources that it cites.

## What changed

- Added `nova/tests/layout/record_claims.py`. It holds the checks on the sections and the copy claims of the record.
- Added `nova/tests/layout/record_paths.py`. It holds the checks on the path claims of the record: the ignored paths and the extra path groups.
- Added `nova/tests/layout/path_mutations.py`. It holds the mutations of the path lists of the record.
- Added `nova/tests/layout/plan_mutations.py`. It holds the mutation of the plan copy in a work directory.
- Moved the required-section check and the ignored-directory check out of `claims_checks.py`. That module now holds the scope, omitted-file, allow-list and named-file checks only.
- `check_layout.py`: added four checks. V verifies the required sections. W verifies the ignored directories, the ignored directory suffixes, the ignored files and the ignored file suffixes. X verifies the path groups. Y verifies the row count and the catalogue service count that the authoritative copy section states. The runner now holds 26 checks. Z verifies that no plan path holds a name that the checker skips.
- `record_mutations.py`: the path-list mutations moved to `path_mutations.py`. The plan mutations moved to `plan_mutations.py`.
- `mutations.py`: added `insert_diff`. It inserts a sentence into the record of a work tree.
- `test_layout_checks.py`: registered the new mutations. The suite now holds 48 mutations and two acceptance scenarios. The work directory is a git repo, so the git check runs in every mutation and scenario. The plan is a copy, so a mutation never changes the real plan. A separate test proves that the git check finds a leak that the text check cannot see.
- `claims_checks.py`: the omitted-files section must now name exactly the files that the tree omits. A count alone no longer passes.
- `copy_checks.py`: every table in the task 16 copy is compared with the record. A copy with a second table no longer hides a mismatch.
- `diff_checks.py`: the deferred cloud check now verifies that no plan task names the deferred directory and that a plan task names the overlay directory.
- `diff_doc.py`: the module task patterns accept a lowercase `module`.
- `source_checks.py`: a plan citation must share most of the words of its sentence, and a cited line must hold every term that the sentence names in backticks.
- `ignored_paths.py`: added `playwright-report`, `test-results` and `storybook-static` to the ignored directories. Added the `.egg-info` directory suffix. The module states the ignored directories, the ignored directory suffixes, the ignored files and the ignored file suffixes.
- `repo_checks.py`: check U now asks git itself whether the build output paths are ignored. It uses `git check-ignore` on a sample path for each ignored name. A git error is a problem, not a pass. A tree without a git checkout fails the check.
- `plan_index.py`: added `service_requirement`. It reads the service count from the plan row of module 01 task 16. It needs the exact requirement wording.
- `spec_index.py`: added the shared `RECORD_PATH` constant. The runner, the mutations and the record checks read it.
- `tree_checks.py`: added the `PLACEHOLDER_NAME` constant. Added check Z. It fails when a plan task names a path that the checker skips.
- `.gitignore`: added the same names. The patterns stay sorted by kind.
- `nova/docs/layout-diff.md`: states the ignored directories, the ignored directory suffixes, the ignored files and the ignored file suffixes. Names the new checker modules in the checker module list. States the service map rule of module 01 task 16. States that the ignored names match at any depth, so a source directory with such a name is skipped. States that the owning module adds a new build output name to `nova/tests/layout/ignored_paths.py`.
- `docs/plan/README.md`: the rule that binds the plan now names `nova/tests/layout/ignored_paths.py` as the file that holds the ignore list.

## Later fixes

- The ignore list is scoped. The always ignored names match at any depth. The output names match only directly under a package root. A source directory with an output name below the package root is counted and checked. The user chose this rule.
- `ignored_paths.py` holds the always ignored names, the output names, the directory suffixes, the files and the file suffixes as separate lists. The ignore file holds the same patterns as exact lines.
- The record states the always ignored names and the output names in two sentences.

- Check Y anchored the service requirement. The plan pattern and the record pattern now match the whole phrase. A plan that says `appears exactly once or twice` fails the check. A record that claims the same fails the check.
- Check X keeps the ordinal of each path group. The ordinal must match the position of the group.
- Check T matches a path name as a whole token. A path that is a prefix of a longer path in the plan no longer passes.
- Check Q reads every allow-list that the section states. A second, contradictory allow-list fails the check.
- The rule sentence in the record and in `docs/plan/README.md` names the repo-root `.gitignore` as well. The ignore list lives in three places.

## Design decisions

- The record states the ignored paths in four sentences. One sentence holds each list. Check W parses all four and compares each list with the code. A second list in the same section fails the check.
- Check Q reads every allow-list in the same way as check W.
- Check X compares the path groups, not loose words. Each group must name the expected paths and no other path. A record that states a sixth group fails.
- Check Y reads every count that the section states. A second, wrong count fails the check.
- Check X compares path groups, not loose words. The record names each group by its ordinal. The check reads the group sentences, compares the group count with the count that the record states, and holds the name that each group must carry.
- Check Y ties the service count to the plan. The record count, the plan count and the catalogue count must agree.
- The plan owns the deferral claim. Check K no longer trusts the record alone. It reads the paths that the plan tasks name.
- Check U asks git. A pattern in the text is not enough. The file must make git ignore the path. A git error is a failure, not a pass.
- The copy check compares every table. A copy file can hold the service map table beside the diff table.

## Verification

- `python3 nova/tests/layout/check_layout.py` passes all 27 checks.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 63 mutations. Each check rejects its own mutation. Both acceptance scenarios pass. The git leak test passes.
- The tree counts stay at 54 directories, 44 leaf directories and 43 placeholders.
- The catalogue stays at 23 entries, 22 deployable units and 15 exact matches.
- The layout diff stays at 10 rows.
- Every module stays under 200 lines.

## Note

The copy of the record at `nova/docs/architecture/layout-diff.md` still does not exist. Module 01 task 16 owns it. Check L reports that no copy exists.
