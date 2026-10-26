# 2026-10-26: Fix negator issues for Module 03 (v4)

## Summary
Fixed all 11 blocking issues identified by negator reviews for the Module 03 (Agent Runtime) approach. These fixes prepare the codebase for Stage 0 (Module 05 subset) and Stage A (contracts extension) implementation.

## Changes

### Policy Approval Service - Family Migration to Spec Canonical 7
- Split `families.yaml` (239 lines) into 7 per-family YAML files under `src/policy/families/`:
  - `inbox.yaml`, `calendar_tasks.yaml`, `finance.yaml`, `trips.yaml`, `resume_jobs.yaml`, `notes_memory.yaml`, `integrations.yaml`
- Updated `policy-loader.ts` to load families from the directory
- Migrated family names to match spec §183-193:
  - `calendar` + `tasks` → `calendar_tasks` (one family per spec)
  - `jobs` → `resume_jobs`
  - `channels` → `integrations`
  - Added missing `notes_memory` family
- Added `allowedActions` to all rules for precise action+scope matching
- Updated all policy tests to use new family names, scopes, and rule IDs

### Contracts Package - File Splitting and Extensions
- Split `mcp/call.ts` (233 lines): extracted `errors.ts` for error codes
- Split `mcp/audit.ts` (247 lines): extracted `audit-types.ts` for type definitions
- Extended `audit-contracts.ts`:
  - `PolicyResult`: added `not_evaluated`, `approval_required`
  - `ExecutionStatus`: added 6 spec states (`planned`, `awaiting_approval`, `approved`, `executing`, `cancelled`, `needs_manual_action`)
  - `AuditRecordInput`: added `dedupeKey` field
- Created migration `26-audit-dedupe-extended-enums.sql`:
  - Added `dedupe_key` column with unique partial index
  - Updated `compute_row_hash` to include `dedupe_key` via COALESCE
  - Updated trigger and verification functions
- Updated `SqlAuditRepository`:
  - Default `executionStatus` to `"pending"` (not `"succeeded"`)
  - Handle `ON CONFLICT DO NOTHING` for idempotent inserts
  - Support `dedupeKey` in record and find

### Python Contract Mirrors (Cross-language Parity)
- Created `packages/contracts/mcp/` Python modules:
  - `tool.py`: ToolDefinition validation with unknown-field rejection
  - `call.py`: MCPCall/MCPResponse validation
  - `audit.py`: MCPAuditEvent validation with secret detection
  - `service_token.py`: HS256 JWT issue/verify with timing-safe comparison
  - `approval_hash.py`: Canonical JSON + SHA-256 matching TS exactly (UTF-16 code-unit sort, NaN/Infinity/-0 handling)

### Models Directory (Module 05 Subset)
- Created `nova/models/setup.sh`: Pulls/pins Ollama digests, supports `--from-manifest` and `--verify-only`
- Created `nova/models/model-registry.yaml`:
  - 6 model rows (qwen3.5 0.8b/2b/4b/9b, bge-small-en, multilingual-e5-small)
  - 12-hex digest prefixes from ollama.com tag pages
  - `router_role: classifier_only|planner` for tier enforcement
  - Routing policy block mapping 7 canonical families to tiers
  - CI fake model row (`nova-fake-model`) with `ci_only: true`

### API Gateway
- Updated contract validation: `channels/link` → `integrations/link`

### Layout and Documentation
- Updated tree counts: 118 dirs, 81 leaves, 37 placeholders (was 116/80/37)
- Updated `repo.md`, `docs/layout-diff.md` with new counts
- Removed `models/model-registry.yaml` from omitted files list

## Testing
- Contracts: 173 tests pass
- Policy-approval-service: 122 tests pass
- Audit-service: 12 tests pass
- API-gateway: 50 tests pass
- Layout checker: all 28 checks pass

## Files Added/Modified
- `nova/services/policy-approval-service/src/policy/families/*.yaml` (7 new)
- `nova/services/policy-approval-service/src/policy/policy-loader.ts` (modified)
- `nova/services/policy-approval-service/src/policy/policy-loader.test.ts` (modified)
- `nova/services/policy-approval-service/src/policy/policy-decision.service.test.ts` (modified)
- `nova/services/policy-approval-service/src/policy/policy-decision.service.bulk.test.ts` (modified)
- `nova/services/policy-approval-service/src/policy/policy-decision.service.chat-approval.test.ts` (modified)
- `nova/packages/contracts/mcp/errors.ts` (new)
- `nova/packages/contracts/mcp/audit-types.ts` (new)
- `nova/packages/contracts/mcp/call.ts` (modified)
- `nova/packages/contracts/mcp/audit.ts` (modified)
- `nova/packages/contracts/audit-contracts.ts` (modified)
- `nova/packages/contracts/migrations/26-audit-dedupe-extended-enums.sql` (new)
- `nova/services/audit-service/src/audit-repository.sql.ts` (modified)
- `nova/packages/contracts/mcp/service_token.py` (new)
- `nova/packages/contracts/mcp/approval_hash.py` (new)
- `nova/packages/contracts/mcp/tool.py` (new)
- `nova/packages/contracts/mcp/call.py` (new)
- `nova/packages/contracts/mcp/audit.py` (new)
- `nova/models/setup.sh` (new)
- `nova/models/model-registry.yaml` (new)
- `nova/services/api-gateway/src/lib/contract-validation.ts` (modified)
- `nova/tests/layout/tree_checks.py` (modified)
- `nova/docs/layout-diff.md` (modified)
- `repo.md` (modified)