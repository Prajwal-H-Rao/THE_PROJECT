# Design note: the export and deletion workflow (task 02.13)

Date: 2026-11-06. Status: proposed. Awaits owner approval before implementation.

## Scope

Task 02.13 writes the application-layer export and deletion workflow for user data. Migration 11 already supplies the SQL functions `export_user_data(p_user_id)` and `delete_user_data(p_user_id)` in the `audit_activity_service` schema. This note decides how the audit service exposes them and how deletion propagates to the five target stores of spec:860.

## Governing spec lines

- spec:860: "Export and deletion workflows must propagate to vectors, object files, queued tasks, channel mappings and caches."
- spec:746: audit-activity-service owns append-only event records with restricted read access and retention policy.
- spec:907: do not record access tokens, passwords, full resumes, full bank statement rows, unnecessary email bodies or model hidden reasoning in audit records.
- spec:141: do not record a `succeeded` state until authoritative result evidence exists.

## Design decisions

1. Ownership: the audit service owns the workflow. It exposes two HTTP endpoints, `POST /v1/export` and `POST /v1/delete`, that take a verified `user_id` from the authenticated session and call the migration-11 SQL functions through the audit service repository.

2. Authorization: an actor may export or delete only their own `user_id`, unless they hold the `audit_activity_service` role. The repository checks the actor identity before calling the SQL function. The SQL functions run `SECURITY DEFINER` as the audit service role, so they read across all service schemas.

3. Export: `export_user_data` returns a JSONB document with every user row across all service schemas plus the audit rows where `actor_id = user_id` or `resource_id = user_id` (spec:746 restricted read). No secret material is included; spec:907 fields are excluded.

4. Deletion: `delete_user_data` deletes rows from the five domain stores (jobs, trips, finance, notes, tasks/inbox), deletes queued tasks (`queue_outbox`) and channel mappings (`channel_identities`), marks audit rows with `{user_deleted: true}` instead of deleting them (append-only legal hold), and collects object store refs into `deletion_object_refs` for async deletion.

5. Five target stores (spec:860):
   - vectors: dormant. The vector leg runs from P6 when `10-tasks-notes` activates pgvector. No vector deletion code exists now.
   - object files: async. The scheduler/worker reads `deletion_object_refs` and deletes the objects from RustFS, then clears the refs.
   - queued tasks: deleted from `jobs_service.queue_outbox` and `event_receipts`.
   - channel mappings: deleted from `identity_service.channel_identities`.
   - caches: sessions deleted from `identity_service.sessions`; in-memory caches invalidated on the next read.

6. Test proof: export contains every user row plus the audit records the user may read. Deletion removes rows in all five target stores, and the vector leg runs from P6 when `10-tasks-notes` activates it.

## What waits

- The vector leg is dormant until P6 (module 10 task 11 activates pgvector on the notes schema).
- The async object-store deletion worker lands with the scheduler of module 13/16; until then, refs accumulate in `deletion_object_refs` and the application layer deletes them directly.
- No privileged migration is needed later: the vector column already exists from task 11 of module 02.
