# 2026-10-21 — Replace the tool registry with an MCP surface

## Goal

Expose every external action through an MCP server. The MCP surface carries its own authorization: a service JWT proves the caller, the policy service decides the role, and the audit service records the decision.

## What changed

- Added `docs/plan/21-mcp-surface.md`. The module holds 14 tasks. Its first task writes the MCP surface contract. Its second task builds the server library. Its third task builds the client. Its fourth task adds the roles. No MCP server exists before the contract and the authorization exist.
- The new module owns the MCP tool catalogue, the roles, the approval binding, the audit, the bounded fetch tool, the browser worker and the per-service MCP servers.
- `docs/plan/03-agent-runtime.md`: the title and the first four tasks now use the MCP tool definition and the MCP tool catalogue. The build order follows. A new acceptance test states that the orchestrator reaches a tool only through the MCP client.
- `docs/plan/19-tech-and-curriculum.md`: the rule that forbade MCP is gone. The file now records the deviation and names the module that owns the surface. The test `test_tool_contract_is_registry_not_mcp` is replaced by `test_mcp_surface_is_scoped_and_authorized` and `test_mcp_deviation_has_a_design_note`. The design-note task names the deviation.
- `docs/plan/05-model-strategy.md`: the two references to the tool registry now name the MCP surface.
- `docs/plan/09-inbox-calendar.md` and `docs/plan/10-tasks-notes.md`: the tool families now register in the MCP tool catalogue.
- `docs/plan/order-and-constraints.md`: the P5 rule now starts with `21-mcp-surface`.
- `docs/plan/README.md`: the phase table names the new module in P5 and holds 386 tasks over 21 files. A new rule states that every external action reaches a tool through an MCP server.
- `docs/plan/coverage.md`: the two affected spec headings now name the new module as a second owner.
- `repo.md`: the plan entry holds 25 files and 386 tasks.

## Design decisions

- MCP replaces the registry. The registry fields at spec:500 move onto the MCP tool definition. The checks of module 03 and module 04 move onto the MCP side.
- The spec was not edited in this change. The later change `2026-10-21-spec-mcp-surface.md` edits it and remaps every citation. The deviation is also recorded in `docs/design-notes/`.
- The browser stays bounded. spec:501 forbids a generic browser tool, so the fetch tool reaches an allow-list of domains and the browser worker renders allow-listed pages only. It holds no credential.
- The roles live in the policy service. Module 07 task 17 already defines `admin` and `user`. The new module adds `viewer` and maps each tool to the roles that may call it.
- One MCP server per service. The permission boundary stays the service boundary, and a provider credential never leaves its owner.
- The MCP surface lands in P5, before the agent runtime. The orchestrator needs the client, and the client needs the contract, the roles and the policy decision.
- The browser worker is a new path under `workers/`. The spec layout does not name it, so the record gains a path group when the task runs.
- The maps tool belongs to the trips service. The plan already gates it at `order-and-constraints.md`.

## Verification

- The task count is 386 across 21 module files. The phase counts match the task tables.
- `python3 nova/tests/layout/check_layout.py` passes all 27 checks.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 64 mutations. The four acceptance scenarios pass.
- Every plan file stays under 200 lines.

## Open items

- The spec now names the MCP surface. The change from the earlier registry wording is recorded in `docs/design-notes/` by module 19 task 4.
- The design note for the deviation is written by module 19 task 4.
