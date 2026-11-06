# 2026-11-04 — P8 task 3: employer registry seed artifact

## Problem

P8 module 13 task 3 requires owning the seed artifact: copy `NOVA_Employer_Targets_500.csv` to `data/employer-seed-v1.csv` (spec:959 path) as versioned data, not configuration. The file did not exist and was listed as omitted in the layout record.

## Changes

- `nova/data/employer-seed-v1.csv` — new file, exact copy of `NOVA_Employer_Targets_500.csv` (31073 bytes, identical diff, 501 lines = 1 header + 500 data rows, 11 columns, no populated `career_url`).
- `nova/docs/layout-diff.md` — Omitted files section updated: count changed from 1 to 0, reference to `data/employer-seed-v1.csv` removed (it no longer exists as an omitted file).

## Verification

- `python3 nova/tests/layout/check_layout.py` → exit 0, all 28 checks pass, tree counts unchanged (182/112/43).
- `python3 nova/tests/layout/test_layout_checks.py` → exit 0, every mutation rejected.
- Both negators returned SOUND before implementation.

## Notes

- `data/` already existed (held only `.gitkeep`), so adding one file creates no new directory — tree counts unchanged.
- `data/` is not in `EXTRA_DIRECTORY_PREFIXES`, but `data/employer-seed-v1.csv` is owned by P8 module 13 task 3 per `docs/plan/13-employer-registry.md:42`, so `is_owned` returns true and check P passes.
