# Change — 2026-11-06-p1-m02-t13-export-deletion-partial

## Problem

Task 02.13 (module 02, P1): write the export and deletion workflow. Migration 11 already supplies the SQL functions `export_user_data` and `delete_user_data` (spec:746, spec:860), but the task has no passing test — status.md marks it Partial. The design note `docs/design-notes/nova-export-deletion.md` was written and approved by the owner.

## Changes

- Wrote the test first at `nova/services/audit-service/src/audit-export-deletion.test.ts`. It runs migration 11 against a live Postgres, inserts a user plus rows across all domain schemas, calls `export_user_data` and asserts the export contains every user row plus the audit records the user may read, then calls `delete_user_data` and asserts all domain rows are removed while audit rows are marked `user_deleted`.
- The TypeScript compiles cleanly (`npm run build` passes).

## Verification

Ran `node --test dist/audit-export-deletion.test.js`. Both tests fail at connection time:

```
DATABASE_URL or NOVA_PG_DATABASE_URL is not set; no Postgres target to test against
```

Root cause: no Postgres server is available in this environment. There are no `psql`, `initdb`, or `postgres` binaries, no `psycopg` Python module, Docker does not function in this WSL distro, and no `NOVA_PG_*` environment variables are set. The test cannot be executed, so it cannot pass.

## Notes

Task 02.13 is marked **partial**: migration-11 code exists and the test exists, but proof is missing because the test cannot run without a live Postgres.

Per execution-plan.md rule 44: the exact error is recorded here; the task is partial, not done. The checkbox in `docs/plan/worklist.md` is NOT ticked (a task is done only when its test passes). `docs/plan/status.md` counts are unchanged (module 02 remains 16 done, 1 open — task 13).

Next step: when a Postgres target is available (local secret file + `NOVA_PG_*` env vars or a working compose stack), run the test, fix the code if needed, then tick 02.13 and update status.md counts.
