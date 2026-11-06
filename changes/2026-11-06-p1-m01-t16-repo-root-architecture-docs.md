# Change — 2026-11-06-p1-m01-t16-repo-root-architecture-docs

## Problem

Repo-root `docs/architecture/` did not exist. Task 01.16 of module 01 requires repo-root `docs/architecture/` with the service map (23 catalogue services, each exactly once) and `docs/architecture/layout-diff.md`. The in-tree copy at `nova/docs/architecture/` already passed the layout checker, but the repo-root copy was absent and was not registered as an extra path group.

## Changes

- Created `docs/architecture/service-map.md` with the 23 catalogue services from spec:721-749, each appearing exactly once, with trust boundary and role per service.
- Created `docs/architecture/layout-diff.md` holding the same 11 layout-diff rows as the record at `nova/docs/layout-diff.md`, in the same order, citing only spec lines the record cites.
- Updated `nova/docs/layout-diff.md` Extra paths: path group count 17 to 18, added the 18th group sentence naming `docs/architecture/layout-diff.md` and `docs/architecture/service-map.md`.
- Updated `nova/tests/layout/record_paths.py`: added the 18th entry to `expected_groups()` with `docs/architecture/layout-diff.md` and `docs/architecture/service-map.md`.

## Verification

`python3 nova/tests/layout/check_layout.py` passes all 28 checks (A-AB), including X (extra paths), M (scope claims), Y (copy claims) and L (authoritative copy).

## Notes

Task 02.13 is the next unchecked item on the worklist. It is a design gate: write the design note first. Do not start task 02.13 without owner approval.
