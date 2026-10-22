# 2026-10-22 — Removed the duplicate packages tree under services/

## Problem

The layout checker failed three checks:

- B: the tree holds 77 directories, not the recorded 73.
- H: `services/packages/{contracts,design-system,generated-clients}` are leaf directories that hold no file.
- M: the record does not state the new counts.

## Cause

The tree held a second copy of the three spec-named packages. The spec names
`packages/{contracts,design-system,generated-clients}` at the `nova/` root at
`spec:944`. The copy under `services/packages/` appears in no source of authority:

- The spec layout — no match.
- The plan in `docs/plan/` — no task names it.
- `nova/docs/layout-diff.md` — no row, not even a rename.
- The user — no instruction created it.

The checker is lenient with directories under the implied parent `services/`, so the
unknown-directory check never flagged it. Only the leaf-file check exposed it.

An earlier fix added placeholders there and recounted the tree to 77/55/43. That
legitimized a spec deviation. It was reverted when the user approved removal.

## Fix

1. Deleted `nova/services/packages/` with its four directories and the three placeholders.
2. Reverted `nova/tests/layout/tree_checks.py` to `EXPECTED_DIRECTORIES = 73`,
   `EXPECTED_LEAVES = 52`, `EXPECTED_PLACEHOLDERS = 40`.
3. Reverted the record sentence in `nova/docs/layout-diff.md` to 73/52/40.
4. Reverted the `wrong_leaf_count` mutation text in
   `nova/tests/layout/record_mutations.py` to the original numbers.
5. Updated the counts in `repo.md`.

## Verification

- `python3 nova/tests/layout/check_layout.py` passes all 28 checks. Tree: 73
  directories, 52 leaves, 40 placeholders.
- `python3 nova/tests/layout/test_layout_checks.py` passes: every mutation was rejected
  by its check, once before the removal and again after the text revert.
- The first mutation run failed on the old numbers while the record held the recount.
  That failure was diagnosed and fixed before the removal. The final state keeps the
  original mutation text.

## Scope

Tree cleanup and record maintenance, with an explicit user decision. The negation loop
does not apply: no code path changed.

## Type

Tree maintenance.
