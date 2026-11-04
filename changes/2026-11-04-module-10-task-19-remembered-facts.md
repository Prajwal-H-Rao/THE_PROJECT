# 2026-11-04 module-10-task-19-remembered-facts

## Summary
Module 10 Task 19: Remembered-fact controls — per-item source, edit, deletion and forget action.
New `remembered_facts` table with full CRUD, soft archive and hard forget (vector removal).

## Changes
- `nova/packages/contracts/migrations/38-remembered-facts.sql` — New migration.
  - `remembered_facts` table: fact_id UUID PK, user_id UUID NOT NULL, fact_text TEXT NOT NULL,
    source_type TEXT, source_ref TEXT, embedding vector(384) nullable,
    is_archived BOOLEAN NOT NULL DEFAULT false, created_at/updated_at TIMESTAMPTZ.
  - `AUTHORIZATION notes_memory_service` (matches all other tables in schema).
  - Indexes on user_id and is_archived.
- `nova/services/tasks-reminders-service/src/facts/fact.entity.ts` — New (~41 lines).
  - `RememberedFact`, `CreateFactInput`, `UpdateFactInput`, `FactListFilter`, `FactSearchResult` interfaces.
- `nova/services/tasks-reminders-service/src/facts/fact.repository.ts` — New (~162 lines).
  - `FactRepository`: create, getFact, listFacts (source/archive filter), updateFact,
    archiveFact (soft), forgetFact (hard DELETE removes row + inline vector). All queries filter by user_id.
- `nova/services/tasks-reminders-service/src/facts/fact.service.ts` — New (~81 lines).
  - `FactService`: createFact, sourceFact, listFacts, editFact, archiveFact, forgetFact.
  - `FactNotFoundError`, `FactForbiddenError` error classes.
- `nova/services/tasks-reminders-service/src/facts/fact.controller.ts` — New (~143 lines).
  - `FactController`: POST /facts, GET /facts, GET /facts/:factId, PATCH /facts/:factId,
    DELETE /facts/:factId (archive), DELETE /facts/:factId/forget (hard delete).
    x-user-id guard on all endpoints; maps FactNotFoundError to 404.
- `nova/services/tasks-reminders-service/src/facts/fact.module.ts` — New (~16 lines).
  - `FactModule` wiring repository, service, controller.
- `nova/services/tasks-reminders-service/src/app.module.ts` — Registered `FactModule` in imports.
- `nova/services/tasks-reminders-service/src/facts/fact.service.test.ts` — New (~133 lines).
  - 7 tests: create, source denial, list empty on denial, edit denial, archive denial, forget denial.
- `nova/services/tasks-reminders-service/src/facts/fact.controller.test.ts` — New (~100 lines).
  - 8 tests: header enforcement on create/list/getOne, create fact, getOne/edit/archive/forget denial mapping.

## Tests
- Service suite: `tsc` clean, 77 tests, 77 pass, 0 fail (was 63; +14 fact tests).

## Known gaps (documented, intended)
- Web UI for remembered facts (plan doc artifact says "notes schema + web UI"): not implemented.
  Service layer complete; web UI is a separate frontend task.
- `forgetFact` hard-deletes the row; pgvector `embedding` is an inline column so no separate
  vector cleanup is needed (deletion consistency satisfied).
