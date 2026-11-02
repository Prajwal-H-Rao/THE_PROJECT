# 2026-11-01 module-01-mcp-catalogue-file-split

## Summary
Effort 1 — MCP catalogue file split (Module 01 / plan 21-mcp-surface): split 3 oversized MCP contract files into per-concern files under 200 lines each, using barrel re-export files so existing imports (index.ts, all 3 test files, mcp-client, registry) remain unchanged.

## Changes
- `nova/packages/contracts/mcp/tool.ts` (269) → `tool-types.ts` (110: types + constants + *Values arrays) + `tool-validate.ts` (185: validation + validate_tool_definition) + `tool.ts` barrel re-exporting ALL from both
- `nova/packages/contracts/mcp/audit.ts` (244) → `audit-helpers.ts` (115: UUID/ISO8601/hex/secret-check helpers) + `audit-event.ts` (138: validate_mcp_audit_event with local VALID_EVENT_TYPES Set) + `audit.ts` barrel re-exporting from ./audit-types.js and ./audit-event.js
- `nova/packages/contracts/mcp/call.ts` (214) → `call-types.ts` (58: interfaces + known field sets) + `call-helpers.ts` (72: UUID/ISO/error-code/optional-string/helpers) + `call-validate.ts` (135: validate_mcp_call + validate_mcp_response) + `call.ts` barrel re-exporting from ./call-types.js, ./call-helpers.js, ./call-validate.js, AND ./errors.js
- `nova/packages/contracts/mcp/mcp-helpers.ts` (49) — NEW: shared helpers (validateOptionalString, isValidUUID, isValidISO8601) consolidating 3 copies each of validateOptionalString, 2 copies each of isValidUUID and isValidISO8601 previously split across tool-validate.ts, audit-helpers.ts, and call-helpers.ts
- `nova/packages/contracts/tsconfig.json` — added all 7 new content files plus audit-types.ts, errors.ts, and mcp-helpers.ts to include list
- `repo.md` — updated MCP file structure notes

## Tests
- `tsc --noEmit`: only pre-existing `migrations/runner.ts` error (unrelated)
- All 102 MCP tests pass (tool: 47, call: 28, audit: 27)
- `mcp/server/registry.ts` compiles unchanged
- All files under 200 lines with header comments and one-line purpose comments per function
- ASD-STE100 throughout. No `any` types.
- Barrel re-export completeness verified: every symbol imported by index.ts, all 3 test files, client.ts, and registry.ts is traceable to a source module

## Notes
- `audit-event.ts` uses a local `VALID_EVENT_TYPES` Set instead of importing `MCPAuditEventTypeValues` from `audit-types.ts` because TypeScript elides `as const` readonly array imports (compiler treats them as type-only). The Set mirrors the values in audit-types.ts.
- `call.ts` lines 7-62 helpers (previously orphaned in the v2 approach) are now in `call-helpers.ts` and imported by `call-validate.ts`.
- All barrels re-export every symbol the original file exported (including ToolResult, MCPAuditEventTypeValues, MCPErrorCodeValues, *Values arrays).
- Duplicate helpers consolidated into `mcp-helpers.ts`: `validateOptionalString` (was 3 copies), `isValidUUID` (was 2 copies), `isValidISO8601` (was 2 copies).
- One-line purpose comments added to all 19 functions across tool-validate.ts, audit-event.ts, audit-helpers.ts, call-helpers.ts, call-validate.ts.
- tree_checks: new files under `packages/contracts/mcp/` are owned via plan 21-mcp-surface.md backtick prefix.
- Pre-existing `migrations/runner.ts` error (TS18047) is unrelated to this change.
