# Changelog: 2026-10-26 - Module 21 MCP Surface Complete

## Summary
Completed Module 21 (MCP Surface & Tool Authorization) with full contract definitions, validation, and test coverage.

## Changes

### New Contracts Package Exports
- `./mcp` - Main MCP surface entry point
- `./mcp/tool` - Tool definition contract
- `./mcp/call` - Call/response wire contracts
- `./mcp/audit` - Audit event contract

### MCP Tool Definition Contract (`mcp/tool.ts`)
- Tool risk tiers: tier1 (read-only), tier2 (write self), tier3 (external effects), tier4 (critical)
- Idempotency strategies: none, idempotency_key, natural
- Read/write classification
- Default risk_tier based on classification (read→tier1, write→tier2)
- Default idempotency: none
- Quota format validation (case-insensitive, supports h/hour)
- Timeout validation (ISO 8601 duration)
- Allowed roles/scopes/provider allowlist validation
- Verifier string validation
- Positive integer version validation
- Explicit array rejection with clear error messages
- Safe typed return (no unsafe casts)

### MCP Call/Response Wire Contracts (`mcp/call.ts`)
- UUID validation (all RFC 4122 versions v1-v5, v7)
- ISO 8601 timestamp validation (accepts offsets, no ms, no tz)
- 27 error codes including new: validation_failed, schema_mismatch, circuit_open, dependency_failed
- Explicit array rejection for arguments, result, error.details
- Optional string field validation (idempotency_key, service_jwt, user_id, correlation_id)
- Safe typed returns (no unsafe casts)

### MCP Audit Event Contract (`mcp/audit.ts`)
- Recursive secret detection in payload (nested objects, arrays)
- Circular reference protection with WeakSet
- Exact-match semantics for forbidden keys (password_hash, access_token_expiry allowed)
- Case-insensitive forbidden key matching (snake_case + camelCase/PascalCase variants)
- Default payload to empty object if missing
- UUID validation for event_id (all RFC 4122 versions)
- ISO 8601 timestamp validation for occurred_at
- Hex validation for previous_hash/row_hash
- Safe typed return (explicit construction)

### Test Coverage
- **173 tests passing** across all contracts
- Tool tests: 31 tests (validation, defaults, array rejection, mutation safety, edge cases)
- Call tests: 35 tests (validation, UUID, timestamps, arrays, mutation safety)
- Audit tests: 31 tests (validation, secrets, circular refs, mutation safety, edge cases)
- All mutation safety tests verify input objects are not modified
- Circular reference DoS protection tested
- Nested/array secret detection tested
- Exact-match semantics for password_hash/access_token_expiry verified
- ISO 8601 timestamp format variations tested
- Array rejection for all object-expected fields tested

## Files Added
- `nova/packages/contracts/mcp/index.ts`
- `nova/packages/contracts/mcp/tool.ts`
- `nova/packages/contracts/mcp/call.ts`
- `nova/packages/contracts/mcp/audit.ts`
- `nova/packages/contracts/mcp/tool.test.ts`
- `nova/packages/contracts/mcp/call.test.ts`
- `nova/packages/contracts/mcp/audit.test.ts`

## Files Modified
- `nova/packages/contracts/package.json` - Added MCP exports and test entries
- `nova/packages/contracts/tsconfig.json` - Added MCP files to include