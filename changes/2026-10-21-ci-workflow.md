# 2026-10-21 — Add lint, typecheck and the CI workflow

## Goal

Land module 01 task 2. Add one CI workflow that lints, typechecks and runs the layout checks. The workflow must fail on a type error.

## What changed

- Added `.github/workflows/ci.yml`. It is the single workflow. It checks out the repository, sets up Python 3.12, installs ruff 0.17.1 and mypy 2.4.0, runs the layout checks, runs `ruff check .`, runs `mypy nova/tests/layout`, and runs a proof step.
- The proof step writes a file inside the checked path. The file holds an untyped function that assigns a string to an integer variable. The step runs the same mypy command as the gate. It fails unless mypy exits with code 1 and names the proof file. It deletes the file before it ends.
- Added `pyproject.toml`. It holds the ruff settings and the mypy settings. The ruff target is Python 3.12 and the line length is 120. The mypy target is Python 3.12, the checked path is `nova/tests/layout`, and `check_untyped_defs` is on. The mypy gate then fails on a type error inside an untyped function.
- Added `nova/tests/layout/ci_checks.py`. It checks that the workflow runs both layout commands, pins both tools, runs the lint and the typecheck, uses Python 3.12, and proves the type error. It also checks the tool config.
- Added `nova/tests/layout/ci_mutations.py`. It holds the mutations of the workflow and the config.
- `check_layout.py`: added check AA. It verifies the CI workflow and the tool config.
- `test_layout_checks.py`: the work directory now holds a copy of the workflow and the tool config. Eight new mutations prove that check AA rejects a missing typecheck step, an unpinned tool, a missing config, a `continue-on-error` marker, a path filter, a missing push trigger, a gutted proof step and a typecheck scope that drifts from the config.
- `record_paths.py`: the path group check now derives the checker module names from the checker directory. It derives the repo root file names from the workflow path, the config path and the ignore file name. A path name is a word with a slash, a leading dot or a known file suffix.
- `nova/docs/layout-diff.md`: the third path group names the two new checker modules. The fifth path group names the repo root files.
- `docs/plan/01-architecture.md`: the artifact cell of task 2 names the config and the checker module.
- `repo.md`: added the workflow and the config entries. Updated the checker counts.

## Later fixes

- The typecheck scope is no longer a literal. The check reads the scope from the workflow and compares it with the scope in the config. A module that widens the scope in both files passes. A scenario proves it.
- Every `mypy` command in the workflow must use the same scope. A proof step that checks another scope fails the check.
- The bypass scan ignores comment lines. A comment that names a marker passes. A scenario proves it.
- The proof file sits on the ignore list. A leftover file breaks no check and git ignores it.
- The plan row names `nova/tests/layout/ci_mutations.py`.
- The rule sentences in the record and in `docs/plan/README.md` name the three CI files. They also name the file that holds the repo root file list.
- The record can name a file with no suffix. The capture rule holds an explicit list of such names.
- `cases.py` holds the mutation list and the scenario list. The runner file stays under 200 lines.

## Design decisions

- The workflow covers Python only. The Node steps land with the `apps/web` scaffold at module 01 task 15.
- The tool versions are pinned. The build must not change without a commit.
- The workflow runs the layout checks as its first gate. The checker is the test suite of the repo.
- The proof step lives in the workflow. It writes its proof file inside the checked path and deletes it again. The gate it proves is the gate the workflow runs.
- The mypy gate uses `check_untyped_defs`. The checker modules carry few annotations, so the flag is what makes the gate real. Three modules needed a type annotation to pass it.
- The actions are pinned to a commit SHA. A tag can move.
- The typecheck scope covers `nova/tests/layout` only. The service modules widen it when they land.
- The type error proof copies a module to a temp directory. The repo copy stays clean.
- The ruff rules are E, F, W and I. The code uses percent formatting, so the UP rules do not apply.
- The line length is 120. The existing modules fit that limit.
- The ruff include path is `nova/**/*.py`. The lint never touches the plan or the spec.

## Verification

- `python3 nova/tests/layout/check_layout.py` passes all 27 checks.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 64 mutations. The four acceptance scenarios pass.
- `ruff check .` passes on the tree.
- `mypy nova/tests/layout` passes on the 20 checker modules with `check_untyped_defs` on.
- The gate fails on a type error. A file inside the checked path that assigns a string to an integer variable makes mypy exit with code 1 and name the file.
- The proof step passes. It requires exit code 1 and the proof file name in the output.
- The tree counts stay at 54 directories, 44 leaf directories and 43 placeholders.

## Open items

- The workflow runs on a push to `main` and on every pull request.
- The Node lint and the Node typecheck land at module 01 task 15.
