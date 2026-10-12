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
| 4 | Create the `audit_log` table from the spec JSON, append-only | audit schema | Insert-only role rejects UPDATE | 5 |
| 5 | Implement hash chaining over audit rows | audit service | Editing a row breaks the chain check | 6 |
| 6 | Create `emails`, `events`, `tasks`, `notes`, `finances`, `trips` | domain schemas | Ownership column is indexed | 6 |
| 7 | Create `resume_profile`, `job_listing`, `job_match`, `application_draft`, `application_submission` | jobs schema | Profile version is immutable | 6 |
| 8 | Create `employer_targets`, `employer_job_sources`, `job_opening`, `job_source_run` | registry schema | Matches the spec SQL at line 586 | 6 |
| 9 | Implement the event envelope with `event_id`, `schema_version`, `correlation_id`, `causation_id` | `packages/contracts/events/` | Backward-compat test passes | 5 |
| 10 | Add object-storage pointers and a retention policy table | finance, notes schemas | Deletion propagates to the object | 4 |
| 11 | Add pgvector as an optional extension for note search | notes schema | Vector row deletes with its note | 4 |
| 12 | Write the export and deletion workflow | audit + all schemas | Export contains every user row | 6 |
| 13 | Add a backup and restore script with a drill | `infra/` scripts | Restore into an empty DB passes | 6 |
| 14 | Add indexes on IDs, timestamps and ownership columns | migrations | `EXPLAIN` uses the index | 3 |

This build sequence sums to 70 hours.

## Build order

Work these steps in order. A step names tasks from the table above. At 30 hours per week a phase spans several weeks, so a step may run into the next week.

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
- pgvector is optional. Ship without it first. Add it in P6 only when you need semantic note search.
- Backup restore is easy to skip. Schedule the drill inside P1, not at the end.
