# 2026-10-21 — Create the NOVA monorepo tree and the layout diff

## Goal

Land module 01 task 1. Create the `nova/` tree from the spec layout. Record the difference between the spec catalogue and the spec layout. Add a checker that proves the tree and the record.

## What changed

- Added `nova/` with 54 directories below the root. The tree matches the layout fence at spec:913-968 except the two files at spec:955 and spec:957. It adds the two implied parents `infra/k8s/overlays` and `infra/terraform`.
- Added 43 `.gitkeep` placeholders. Each placeholder holds one header comment. Git cannot track an empty directory.
- Added `nova/docs/layout-diff.md`. It holds one table with 10 data rows: 3 catalogue-only, 2 layout-only and 5 renamed entries. It holds the sections `Scope`, `Precedence`, `Differences`, `Deferred cloud`, `Omitted files`, `Extra paths` and `Authoritative copy`.
- Added `nova/tests/layout/` with 14 modules. `check_layout.py` runs 23 checks, labelled A to W. `test_layout_checks.py` applies 31 mutations to a copy of the tree and asserts that each check rejects its own mutation. It also applies one acceptance scenario.
- Added `.gitignore` at the repo root. It holds the byte-code patterns and the build output patterns.
- `docs/plan/README.md`: rewrote two rules of "Rules that bind this plan". A module task that adds a path under `nova/` or names a new path in its plan row updates the record and the checker. A directory that the spec layout does not name joins the allow-list in both files. A module task that creates one of the two omitted spec files removes it from the omitted section of the record. The owning module runs the checks.
- `docs/plan/01-architecture.md`: task 1 Artifact cell now names `nova/docs/layout-diff.md` and `nova/tests/layout/` checks. Task 16 names the copy of the record at `docs/architecture/layout-diff.md`.
- `repo.md`: added the third purpose, the `nova/` and `.gitignore` entries, and the verified tree counts.

## Design decisions

- The diff compares the spec catalogue with the spec layout. It does not diff the live tree. The catalogue-to-layout rows hold for every later module.
- The record also holds tree-state and plan-state claims: the directory count, the placeholder count, the allow-list, the omitted files and the plan paths that no task names. A module task that changes the tree or the plan updates the record. The checker fails when the record and the tree drift apart.
- The omitted files section is the source of truth for the omissions. The checker reads the file list and the count from the record. It does not hold a second list that can drift.
- The two spec files stay out of the tree. Module 13 task 3 owns `data/employer-seed-v1.csv`. Module 05 task 2 owns `models/model-registry.yaml`. The record names both files with their spec line and their owner.
- A renamed row pairs a catalogue name with a layout path when the layout basename tokens are a subset of the catalogue name tokens. The rule admits exactly one pairing per unmatched catalogue name. It rejects the telegram and whatsapp swap.
- The tree counts are frozen at 54 directories, 44 leaves and 43 placeholders. A module task that adds a path updates the counts in `nova/tests/layout/tree_checks.py` and the counts in the record.
- The allow-list holds `tests/layout`, `labs` and `db`. A directory passes check B when it sits in the spec layout set, when it lies under a spec-layout directory, or when it matches an allow-list prefix. The record states the allow-list and check Q compares the statement with the code.
- The checker skips the build output. The skipped directory names sit in `nova/tests/layout/ignored_paths.py`. The repo root ignore file holds the same names and check U compares the two. A node install, a next build or a python virtualenv under `nova/` does not change the counts.
- The checker inspects files. Check P rejects a file that no plan task names, rejects a file in the deferred directory, and rejects a placeholder that holds no header comment.
- The checker reads the sources that the record cites. Check R verifies every `spec:` line. Check S verifies every plan file and line citation. Check T verifies that every named path belongs to the build sequence task that names it.
- The row count and the split come from the plan. The checker reads the test cell of the module 01 task 1 plan row. Checks C and D compare the record with that cell. The checker does not hold a second copy of the numbers.
- The checker holds the required sections of the record. Check V fails when a section goes missing.
- The `## Deferred cloud` section cites exactly spec:951, spec:831, spec:438 and spec:677. The plan does not defer `infra/k8s/overlays/eks/`. Module 17 task 13 owns it.
- The checks live in 14 modules. Each module does one job and stays under 200 lines. The largest module is `claims_checks.py` at 182 lines.

## Verification

- `python3 nova/tests/layout/check_layout.py` passes all 23 checks. It prints 54 directories, 44 leaf directories and 43 placeholders. It prints 23 catalogue entries, 22 deployable units and 15 exact matches.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 31 mutations. Each check rejects its own mutation. The build output scenario passes.
- A copy of the tree with a node install, a next build and a python virtualenv keeps every check green.
- A copy of the plan whose task 1 row states a different row count fails checks C and D.
- The task count stays 372. Every plan file stays under 200 lines.
- The spec heading count still prints 74.

## Note

Module 01 task 16 owns the copy of the record. The copy lives at `nova/docs/architecture/layout-diff.md`. Check L compares the kind, the catalogue entry and the layout path of every row. The copy may cite no spec line that the record row does not cite. The check fails when the copy file holds no layout diff table. The copy does not exist yet, so the check reports that no copy exists.
