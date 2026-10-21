# Module 02 — Data model and audit contract

Phase P1. Spec headings: Data Model (Schema Examples), Example API and event conventions, Audit event schema.

## Goal

PostgreSQL holds every domain table under a service-owned schema. An append-only audit trail records every consequential action with evidence. A fabricator cannot write a `succeeded` state.

## Constraints (spec, binding)

Each bullet names the spec line it quotes. Quote marks mean verbatim text.

- Spec:20: "PostgreSQL is the main relational store. Services own tables/schemas and access them through their own repository layer."
- Spec:20: "Do not share a single unconstrained ORM client across service boundaries."
- Spec:117: "Attachments or large content (email body, PDF resumes) can be stored in S3/MinIO with a pointer field."
- Spec:139: "Do not record a `succeeded` state until authoritative result evidence exists."
- Spec:903: "Do not put access tokens, passwords, full resumes, full bank statement rows, unnecessary email bodies or model hidden reasoning in audit records."
- Spec:903: "Use append-only DB permissions; optionally hash-chain events."

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Write migration tooling with one branch per service | `packages/contracts/migrations/` | Migrations replay from zero | 4 |
| 2 | Create `users`, `sessions`, `channel_identities` | identity schema | Unique constraint on linked channel | 4 |
| 3 | Create `approvals`, `policy_decisions` | policy schema | Approval binds to a payload hash | 5 |
| 4 | Create the `audit_log` table from the spec JSON, append-only, with the `execution_status` and `verification_type` columns a success record requires | audit schema | Insert-only role rejects UPDATE, and a succeeded status with `verification_type = none` fails a check constraint | 5 |
| 5 | Implement hash chaining over audit rows | audit service | Editing a row breaks the chain check | 6 |
| 6 | Create `emails`, `events`, `tasks`, `notes`, `finances`, `trips` | domain schemas | Ownership column is indexed | 6 |
| 7 | Create `resume_profile`, `job_listing`, `job_match`, `application_draft`, `application_submission` | jobs schema | Profile version is immutable | 6 |
| 8 | Create `employer_targets`, `employer_job_sources`, `job_opening`, `job_source_run` | registry schema | Matches the spec SQL at line 587 | 6 |
| 9 | Implement the event envelope with `event_id`, `schema_version`, `correlation_id`, `causation_id` | `packages/contracts/events/` | Backward-compat test passes | 5 |
| 10 | Add object-storage pointers and a retention policy table | finance, notes schemas | Deletion propagates to the object | 4 |
| 11 | Install pgvector on the notes schema now and add the vector column, so no privileged migration is needed later. `10-tasks-notes` activates it in P6 | notes schema | A row holding a vector value inserts and deletes on the notes schema | 4 |
| 12 | Record the privacy, AI, employment and messaging review for the actual jurisdiction, then set every retention period from it | `docs/privacy-review.md` | Every retention row cites the review, and no period is set without it (spec:237, spec:229) | 4 |
| 13 | Write the export and deletion workflow. Deletion propagates to vectors, object files, queued tasks, channel mappings and caches, per spec:856 | audit + all schemas | Export contains every user row plus the audit records that user may read (spec:742). Deletion removes rows in all five target stores, and the vector leg runs from P6 when `10-tasks-notes` activates it. | 6 |
| 14 | Add a backup and restore script with a drill | `infra/` scripts | Restore into an empty DB passes | 6 |
| 15 | Add indexes on IDs, timestamps and ownership columns | migrations | `EXPLAIN` uses the index | 3 |
| 16 | Build audit search: filter by actor, action, resource, policy result and time, served by the audit service (spec:742) | audit service | An unknown filter is rejected, and a caller reads only rows their role allows | 6 |

This build sequence sums to 80 hours.

## Build order

Work these steps in order. A step names tasks from the table above. At 40 hours per week a phase spans several weeks, so a step may run into the next week.

1. Write migration tooling and the `users` schema.
2. Create `audit_log` with append-only permissions.
3. Add hash chaining and a chain-verification test.

## Acceptance tests

- `test_audit_role_rejects_update` — the audit role cannot run UPDATE or DELETE.
- `test_audit_chain_detects_edit` — modifying a row makes chain verification fail.
- `test_succeeded_requires_evidence` — writing `execution_status = succeeded` with `verification_type = none` fails a check constraint.
- `test_cross_service_write_denied` — a service cannot insert into another service's schema.
- `test_export_covers_all_user_rows` — export row counts match table counts.
- `test_restore_from_backup` — a drill restores and passes the schema check.

## Risks

- Hash chaining is tamper evidence, not immutability. Say so in the runbook.
- pgvector ships in P1 so the vector columns exist from the start. The semantic search path stays dormant until P6. Enabling it early costs a small startup check and avoids a privileged migration later.
- Backup restore is easy to skip. Schedule the drill inside P1, not at the end.
