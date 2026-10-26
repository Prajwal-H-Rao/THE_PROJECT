# 2026-10-25 — Fix all negator blocking issues

## Scope

Fix all 17 blocking objections found by negator reviews across modules 01, 02, 07, 08, 19.

## Priority 1: Runtime Crashes / Data Loss (5 issues)

### 1. Missing `totp_secrets` table (Module 07)
- **File**: `nova/packages/contracts/migrations/10-totp-secrets.sql` (new)
- Creates `identity_service.totp_secrets` with per-user salt for backup code hashing
- Functions: `create_totp_secret`, `verify_and_consume_backup_code`, `disable_totp`, `get_totp_secret`
- Referenced by migration 20 `revoke_user_totp`

### 2. `delete_user_data` loses object refs (Module 02, Migration 11)
- **File**: `nova/packages/contracts/migrations/11-export-deletion.sql`
- Fixed `array_agg` overwriting: now accumulates with `v_object_refs := v_object_refs || COALESCE(v_new_refs, '{}')`
- Fixed attachments ref extraction: `SELECT elem->>'ref' FROM ... LATERAL jsonb_array_elements(attachments) AS elem`
- Replaced temp table `_deletion_object_refs` with permanent table `audit_activity_service.deletion_object_refs`
- Added `clear_deletion_object_refs` function

### 3. `get_deletion_object_refs` reads vanished temp table (Module 02, Migration 11)
- **File**: `nova/packages/contracts/migrations/11-export-deletion.sql`
- Now reads from permanent `deletion_object_refs` table keyed by `user_id`

### 4. `search_audit_log` dynamic SQL broken (Module 02, Migration 13)
- **File**: `nova/packages/contracts/migrations/13-audit-search.sql`
- Fixed `EXECUTE ... USING` with array: now uses fixed 12 parameter positions ($1-$12)
- All filter parameters passed positionally, NULL for unset ones

### 5. Lab 1 CI installs in wrong package (Module 19)
- **File**: `.github/workflows/labs.yml`
- Changed `cd nova/packages/contracts && npm ci` to `cd labs/lab01 && npm ci`

## Priority 2: Security / Spec Compliance (7 issues)

### 6. TOTP backup codes hardcoded salt (Module 07)
- **File**: `nova/services/identity-service/src/totp/totp.service.ts`
- Added `generateBackupCodeSalt()` using `randomBytes(16)`
- `hashBackupCode(code, salt)` now uses per-user salt
- Updated `enableTotp`, `getTotpSecret`, `verifyLogin` to use/store salt

### 7. PKCE code_verifier stored in plaintext (Module 07)
- **Files**: `nova/services/identity-service/src/auth/oidc-state.store.ts`, `nova/packages/contracts/migrations/17-oidc-states.sql`
- Renamed column `code_verifier` → `code_verifier_hash`
- Added `hashCodeVerifier()` and `verifyCodeVerifier()` using SHA-256
- Updated `create`, `consume`, `find` functions

### 8. OIDC nonce not validated (Module 07)
- **File**: `nova/services/identity-service/src/auth/oidc.service.ts`
- Added `parseIdToken()` to extract nonce from ID token
- Validates `payload.nonce === stateRecord.nonce` in `exchangeCode`

### 9. Refresh token encryption hardcoded DEK length (Module 02, Migration 15)
- **File**: `nova/packages/contracts/migrations/15-refresh-tokens.sql`
- Added 4-byte big-endian length prefix for encrypted DEK
- Added `int4tobe4()` and `int4frombe4()` helper functions
- Format: `len(enc_dek) || enc_dek || enc_token`

### 10. Audit hash chain not persistent (Module 08)
- **Files**: `nova/services/audit-service/src/audit-repository.sql.ts` (new), `nova/services/audit-service/src/audit.module.ts`, `nova/services/audit-service/src/app.module.ts`, `nova/services/audit-service/src/db/db.module.ts` (new)
- Created `SqlAuditRepository` using `audit_activity_service.audit_log` table
- PostgreSQL trigger `set_audit_hashes` maintains persistent hash chain
- Added `DbModule` with `PG_POOL` for audit service

### 11. Escalation detection via regex (Module 08)
- **Files**: `nova/services/policy-approval-service/src/policy/policy-schema.ts`, `nova/services/policy-approval-service/src/policy/policy-bulk-decision.ts`, `nova/services/policy-approval-service/src/policy/families.yaml`
- Added explicit `isEscalation?: boolean` field to `PolicyRule`
- Updated `isEscalationAction()` to check `rule.isEscalation === true` first
- Added `isEscalation: true` to escalation rules: `inbox.send`, `calendar.invite`, `finance.import`, `jobs.apply`, `channels.link`

### 12. Bulk decision logic contradiction (Module 08)
- **File**: `nova/services/policy-approval-service/src/policy/policy-bulk-decision.ts`
- Fixed priority: `deny > needs_approval (including escalation) > allow`
- Escalation now forces `needs_approval` even when no individual item needs approval

## Priority 3: Architecture / Test Gaps (5 issues)

### 13. Audit service SQL adapter (Module 08)
- **Files**: `nova/services/audit-service/src/audit-repository.sql.ts` (new), module updates
- Replaced `InMemoryAuditRepository` with `SqlAuditRepository`

### 14. Event consumers SQL adapter (Module 01)
- **Files**: `nova/packages/contracts/events/event-consumers.ts`, `nova/packages/contracts/events/event-consumers.sql.ts` (new), `nova/packages/contracts/events/event-consumers.test.ts`
- Added `AsyncReceiptsStore` interface with async methods
- Added `InMemoryAsyncReceipts` for testing
- Added `SqlReceiptsStore` implementation
- Added async delivery functions: `deliverOnceAsync`, `deliverTokenOnceAsync`
- Added concurrency test for atomic `holdAndRecord`

### 15. Contracts package filesystem I/O (Module 01)
- **File**: `nova/packages/contracts/service-api.ts`
- Removed `writeDocument()` function and `fs/promises`, `path`, `fileURLToPath` imports

### 16. Backup drill in CI (Module 02/19)
- **Files**: `.github/workflows/ci.yml`, `nova/infra/scripts/restore.sh`, `nova/infra/scripts/backup-drill.sh`
- Added CI step "Test backup and restore drill"
- Fixed `restore.sh` age decryption: use temp file instead of process substitution
- Updated `backup-drill.sh` for CI environment

### 17. pgvector index default lists (Module 02)
- **File**: `nova/packages/contracts/migrations/06-tasks-schema.sql`
- Added comment explaining `lists` parameter tuning
- Kept `lists = 100` as development default with note to REINDEX after data load

## Verification

- Contracts: 81 tests pass (was 75)
- Policy service: 116 tests pass (was 116)
- Layout checker: 28/28 checks pass (108 dirs, 75 leaves, 37 placeholders)
- All files under 200 lines, header comments, ASD-STE100 language