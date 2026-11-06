# 2026-11-04 — P8 task 4: employer alias reviewed table

## Problem

P8 module 13 task 4 requires recording alias relationships in a separate reviewed table (spec:1546). Test: "No alias is silently discarded." No alias table existed.

## Changes

- `nova/packages/contracts/migrations/39-alias-schema.sql` — creates `employer_registry_service.employer_aliases`: `alias_id` UUID PK, `source_employer_id` UUID NOT NULL FK, `target_employer_id` UUID nullable FK (unresolved subsidiary until review), `alias_name`/`normalized_alias` TEXT NOT NULL, `alias_type`, `confidence`, `reviewed`, `reviewed_by`, `reviewed_at`. Indexes on source and reviewed. Deliberate: no `ON DELETE` clause — Postgres default NO ACTION blocks deletion of a referenced employer instead of silently cascade-deleting alias rows (spec:1546 forbids silent discard).
- `nova/services/employer-registry-service/src/alias.entity.ts` — `EmployerAlias` interface, explicit types, no `any`.
- `nova/services/employer-registry-service/src/alias.repository.ts` — `@Inject("PG_POOL")`, `insertAlias` (parameterized, `RETURNING`, `rows[0]` undefined guard per `noUncheckedIndexedAccess`), `listAliases` (returns every row, filters nothing).
- `nova/services/employer-registry-service/src/alias.service.ts` — `@Injectable EmployerAliasService` wrapping the repository.
- `nova/services/employer-registry-service/src/alias.repository.test.ts` — node:test with the `mockPool` stub (`as unknown as Pool`, tasks-reminders precedent). Tests: insert persists and returns the row; list returns every stored row including `target=null` unreviewed ones.
- `nova/services/employer-registry-service/src/employer.module.ts` — registers `EmployerAliasRepository` + `EmployerAliasService` in providers and exports.
- Mutation-suite anchor repairs (stale after task 3 landed): `mutations.py` `copied_spec_file` → `deleted_spec_file` (the record now names 0 omitted files, so the old premise was dead; new mutation deletes the spec-named seed file), `record_mutations.py` `wrong_omitted_count` anchor 1→0 files, `cases.py` label updated.

## Verification

- `python3 nova/tests/layout/check_layout.py` → exit 0, all checks pass, counts unchanged (182/112/43).
- `python3 nova/tests/layout/test_layout_checks.py` → exit 0, every mutation rejected.
- Both negators returned SOUND on revision 4 (UUID FKs, alias text columns, nullable target, NO ACTION default, no package.json change, scope deferral to tasks 14/21).
- Glob question resolved empirically: `node --test dist/**/*.test.js` runs flat dist tests on Node 22.23.4 (sh passes unmatched glob literally; node native-globs it). No `package.json` change.

## Notes

- Scope: task 4 delivers the schema + recording capability. Importer-side alias capture lands with task 14 (alternate names fields) and task 21 (reviewed diff imports) per the plan build sequence.
- `repo.md` migration count corrected 37 → 41 (migrations 36–39 accumulated over recent tasks).
- Pre-existing debt flagged, out of scope: `employer.repository.ts` targets `employer_registry.employers`, a table no migration creates, and uses `employer: any`.
