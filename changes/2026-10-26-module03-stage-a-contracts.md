# 2026-10-26: Module 03 Stage A — Contracts Extension

## Summary
Completed Stage A of Module 03 (Agent Runtime) — extended the MCP contracts with required fields, unknown-field rejection, per-family catalogue files, and Python mirrors.

## Changes

### Tool Definition Contract (`packages/contracts/mcp/tool.ts`)
- Added required fields per spec:195 and spec:503:
  - `family` (CanonicalFamily: inbox, calendar_tasks, notes_memory, finance, trips, resume_jobs, integrations)
  - `operation_id` (unique operation identifier)
  - `owning_service` (service name)
  - `mcp_server` (MCP server name)
  - `resource_scope` (resource ownership rule)
  - `verifier` (required per spec:195)
- Unknown-field rejection (spec:167) via `KNOWN_TOOL_DEFINITION_FIELDS` set
- Two-step verifier validation: first checks type if provided, then checks required

### MCP Call/Response Contracts (`packages/contracts/mcp/call.ts`)
- Unknown-field rejection for `validate_mcp_call` and `validate_mcp_response`

### MCP Audit Contracts (`packages/contracts/mcp/audit.ts`, `audit-types.ts`)
- Extended `MCPPolicyResult` with `not_evaluated`, `approval_required`
- Extended `MCPExecutionStatus` with 6 spec:174 workflow states (planned, awaiting_approval, approved, executing, cancelled, needs_manual_action)
- Unknown-field rejection for `validate_mcp_audit_event`

### Per-Family Catalogue JSON Files (`packages/contracts/mcp/catalogue/`)
Created 7 files (one per canonical family) with complete operation definitions:
- `inbox.json` (3 operations)
- `calendar_tasks.json` (4 operations)
- `notes_memory.json` (2 operations)
- `finance.json` (2 operations)
- `trips.json` (2 operations)
- `resume_jobs.json` (2 operations)
- `integrations.json` (2 operations)
- Total: 17 operations matching Module 03 tasks 2-4

### Python Contract Mirrors (`packages/contracts/mcp/`)
- Updated `tool.py` with required fields, two-step verifier validation, unknown-field rejection
- Updated `call.py`, `audit.py` with unknown-field rejection (matching TS)

### Layout Updates
- Tree counts: 121 directories, 82 leaves, 37 placeholders
- Updated `repo.md`, `docs/layout-diff.md`, `tree_checks.py`

## Testing
- Contracts: 183 tests pass
- Policy-approval-service: 122 tests pass
- Audit-service: 12 tests pass
- API-gateway: 50 tests pass
- Layout checker: 28/28 checks pass

## Files Added
- `packages/contracts/mcp/catalogue/*.json` (7 files)
- Updated: `tool.ts`, `call.ts`, `audit.ts`, `audit-types.ts`, `tool.py`
- `tree_checks.py`, `repo.md`, `docs/layout-diff.md`