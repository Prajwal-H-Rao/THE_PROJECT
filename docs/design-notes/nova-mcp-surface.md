# Tool Surface / MCP

## Chosen (spec:435)

**MCP (Model Context Protocol) servers, one per owning service, with a shared tool catalogue**

## Rationale

- Every external action uses one transport (MCP).
- The tool definition carries the task family, the scopes, the risk tier, and the verifier.
- The policy service decides each call and the audit records it.
- A shared server would hold every provider credential; each server stays inside the service that owns the tools.

## Rejected

| Option | Reason |
|--------|--------|
| A shared server that holds every provider credential | Violates least privilege (spec:786). A compromised shared server exposes all provider credentials. Per-service MCP servers limit blast radius. |

## Note on "MCP Surface vs Tool Registry"

The spec at lines 503-504 mandates the **MCP tool catalogue** with `tool_id`, version, strict Pydantic input/output classes, JSON Schema, owning service and its MCP server, allowed task family, required scopes, resource ownership rule, risk tier, idempotency requirements, and independent verifier. No separate "tool registry" exists in the spec; the catalogue is the registry. The plan's earlier "tool registry" terminology maps to the MCP tool catalogue.

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row. MCP specification evolves.