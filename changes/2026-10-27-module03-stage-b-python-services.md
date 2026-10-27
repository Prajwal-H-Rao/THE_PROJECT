# 2026-10-27: Module 03 Stage B — Python Services

## Summary
Completed Stage B of Module 03 (Agent Runtime) — implemented the deterministic router, model gateway, MCP client, and MCP server library.

## Changes

### Deterministic Router (`services/agent-orchestrator/orchestrator/router/`)
- `router.py`: Keyword-based NL → family + tier mapping
  - 7 canonical families (inbox, calendar_tasks, notes_memory, finance, trips, resume_jobs, integrations)
  - Action type detection: read, write, consequential (send email, submit application, connect account)
  - Ambiguous requests → clarification; out-of-scope → fixed refusal
  - Reads tier from `models/model-registry.yaml` routing policy
- `test_router.py`: 14 tests covering all families, action types, ambiguity, refusal

### Model Gateway (`services/model-gateway/`)
- `model_gateway.py`: Flask service
  - Reads `models/model-registry.yaml` for model configs and routing policy
  - Provider allow-list, unlisted model rejection
  - `num_ctx` 4096 with truncation marker
  - Secret redaction (api_key, Bearer tokens, etc.)
  - 30s per-call timeout, token-bucket quota per tier
  - Per-tier model resolution (classifier_only vs planner)
- `test_model_gateway.py`: 7 tests for token bucket, redactor, truncator, registry, Flask app

### MCP Client (`services/agent-orchestrator/mcp-client/`)
- `client.ts`: TypeScript client for orchestrator → MCP server
  - Validates call structure locally before HTTP request
  - Attaches service JWT, handles timeouts
  - Validates response structure
  - Methods: `callTool`, `isToolRegistered`, `listTools`
  - Factory: `createMCPClientFromEnv()`

### MCP Server Library (`packages/contracts/mcp/server/`)
- `registry.ts`: TS server library (reused by all MCP servers)
  - `loadCatalogue()`: loads per-family JSON from catalogue directory
  - `verifyServiceJWT()`: HS256 verification via `service-token.ts`
  - `authorizeCall()`: scope/role checks against tool definition
  - `validateAndAuthorizeCall()`: end-to-end validation + grant check for tier3/4
  - `createAuditEvent()`: emits `MCPAuditEvent` for audit service
- `index.ts`: exports

### Plan Updates
- Updated `03-agent-runtime.md` artifact paths to full `services/agent-orchestrator/...` for layout checker

### Layout Updates
- Tree counts: 125 directories, 84 leaves, 37 placeholders

## Testing
- Contracts: 183 tests pass
- Policy-approval-service: 122 tests pass
- Audit-service: 12 tests pass
- API-gateway: 50 tests pass
- Model gateway: 7 tests pass
- Router: 14 tests pass
- Fake model: 8 tests pass
- Model registry: 6 tests pass
- Layout checker: 28/28 checks pass

## Files Added
- `services/agent-orchestrator/orchestrator/router/router.py`, `test_router.py`
- `services/model-gateway/model_gateway.py`, `requirements.txt`, `test_model_gateway.py`
- `services/agent-orchestrator/mcp-client/client.ts`, `index.ts`
- `packages/contracts/mcp/server/registry.ts`, `index.ts`

## Files Modified
- `docs/plan/03-agent-runtime.md` (artifact paths)
- `nova/tests/layout/tree_checks.py` (counts)
- `repo.md` (tree counts)
- `nova/docs/layout-diff.md` (tree counts)