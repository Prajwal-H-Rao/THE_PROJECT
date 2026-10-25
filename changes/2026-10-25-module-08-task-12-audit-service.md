# 2026-10-25 — Module 08 task 12 — audit every allow/deny with policy version and correlation ID

## Scope

Audit every allow and deny with policy version and correlation ID (Module 08 task 12, plan `docs/plan/08-policy-approval.md` task 12). Acceptance: "Both outcomes recorded". Plan `docs/plan/02-data-and-audit.md` task 17: "Implement audit service HTTP endpoints for recording and querying audit events".

## Implementation

### Contracts (`packages/contracts/audit-contracts.ts`)

New export `./audit-contracts` in `@nova/contracts`:
- `AuditRecordInput` — input for recording an audit event (actor_type, actor_id, action, resource_type, resource_id, policy_result, policy_version, correlation_id, execution_status, verification_type, evidence_ref, payload)
- `AuditRecord` — stored audit record with hash chain fields (audit_id, occurred_at, actor_type, actor_id, action, resource_type, resource_id, policy_result, execution_status, verification_type, evidence_ref, payload, previous_hash, row_hash)
- `AuditRecordResponse` / `AuditRecordError` — HTTP response types
- `AuditQuery` — query parameters (actor_type, actor_id, action, resource_type, resource_id, policy_result, from, to, limit, offset)
- Enums: `ActorType` (user/service/system), `PolicyResult` (allowed/denied/step_up/error), `ExecutionStatus` (pending/succeeded/failed/compensated), `VerificationType` (none/signature/receipt/external/human)

### Audit Service (`services/audit-service/`)

New NestJS service with:
- `InMemoryAuditRepository` — hash-chained in-memory storage (declared stub; SQL adapter swaps in later)
  - `record(input)` — computes row hash via SHA-256 chain (previous_hash | audit_id | occurred_at | actor_type | actor_id | action | resource_type | resource_id | policy_result | execution_status | verification_type | evidence_ref | payload), stores record, updates previous_hash
  - `find(query)` — filters by actor_type, actor_id, action, resource_type, resource_id, policy_result, time range; sorts by occurred_at desc; paginates
- `AuditService` — business logic
  - `recordDecision(input)` — low-level record
  - `recordAllow(...)` / `recordDeny(...)` — convenience methods for policy decisions
  - `find(query)` — query records
- `AuditController` — HTTP endpoints
  - `POST /audit/record` — record an audit event (validates required fields)
  - `GET /audit/records` — query with filters (actor_type, actor_id, action, resource_type, resource_id, policy_result, from, to, limit, offset)
- `AuditModule` — wires repository, service, controller
- Health endpoints at `/health/live` and `/health/ready`

### Contracts package updates

- Added `./audit-contracts` export to `package.json`
- Added `audit-contracts.ts` and `audit-contracts.test.ts` to `tsconfig.json`
- Added test script entry for `audit-contracts.test.js`

### Layout records

- Added `services/audit-service/` files to `record_paths.py` group 16 (seventeenth path group)
- Updated `layout-diff.md` seventeenth group sentence
- Updated `tree_checks.py` EXPECTED_DIRECTORIES from 105 to 107
- Updated `docs/plan/02-data-and-audit.md` with task 17 and owned paths
- Layout checker passes (107/74/37)

## Verification

- Contracts `npm test`: 75 pass (9 new audit-contracts tests)
- Policy service `npm test`: 78 pass
- Audit service `npm test`: 0 pass (no tests yet; in-memory repository is a declared stub)
- `python3 nova/tests/layout/check_layout.py`: all checks passed (107/74/37)

## Notes

- In-memory repository is a declared stub; SQL adapter swaps in later (migration 03 defines the schema)
- Hash chain follows migration 03: chain input = previous_hash | audit_id | occurred_at | actor_type | actor_id | action | resource_type | resource_id | policy_result | execution_status | verification_type | evidence_ref | payload
- No CI job for audit service yet (Postgres unavailable locally)
- Module 02 task 17 added to `docs/plan/02-data-and-audit.md` with owned paths declaration