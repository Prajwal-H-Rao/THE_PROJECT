# Module 21 — MCP surface and tool authorization

Phase P5. Spec headings: Agent Runtime, MCP Surface & Tool Catalogue, Agentic and tool-calling protocol.

## Goal

Every external action reaches a tool through an MCP server. The MCP surface carries its own authorization: a service JWT proves the caller, the policy service decides the role, and the audit service records the decision. The model proposes. It never decides.

## Deviation from the spec

The spec fixes the tool contract as the registry at spec:503 and forbids a generic browser at spec:503. The product owner chose the MCP surface instead of the registry. The registry fields move onto the MCP tool definition. The browser stays bounded, so the fetch rule holds.

The spec now names the MCP surface. The design note for the change lives in `docs/design-notes/`. It names the earlier registry wording and the reason. Module 19 task 4 writes it.

## Constraints (spec, binding)

Each bullet names the spec line it quotes. Quote marks mean verbatim text.

- Spec:149: "The model is never permitted to choose arbitrary URLs, SQL, shell commands or filesystem paths as executable instructions."
- Spec:195: each family has an enumerated operation set, an argument schema, a resource scope, a provider allow-list, a risk tier, a quota and a verifier.
- Spec:503: "No arbitrary-URL or generic-browser tool is exposed."
- Spec:6: "All service calls are authenticated and authorized."
- Spec:790: the audit records both allow and deny decisions, with the policy version, the caller workload, the user identity reference, the target, the reason code and the correlation ID. It never records an access token.

## Build sequence

| # | Task | Artifact | Test |
|---|---|---|---|
| 1 | Write the MCP surface contract: transport, tool definition, strict schema, error shape, audit event | `packages/contracts/mcp/` | An unknown field in a tool call fails |
| 2 | Build the MCP server library: registration, argument validation, per-call auth, audit hook | `packages/contracts/mcp/` | A call without a valid service JWT is rejected |
| 3 | Build the MCP client. It is the orchestrator's only path to a tool | `services/agent-orchestrator/mcp-client/` | A call to an unregistered tool fails before policy |
| 4 | Add the roles `admin`, `user` and `viewer` to the policy service | `services/policy-approval-service/` | A viewer call to a write tool is denied |
| 5 | Bind every MCP tool to a task family, a scope, a risk tier and a verifier | MCP tool catalogue | A tool with no family fails |
| 6 | Force an approval before every consequential call. Bind it to the tool, the target and the payload hash | policy service and orchestrator | A consequential call without approval is refused |
| 7 | Audit every call, allow and deny, with the caller, the tool, the target and the reason code | audit service | Every call has one audit row |
| 8 | Add the bounded fetch tool: domain allow-list, robots, rate limits, no arbitrary URL | `packages/contracts/mcp/` | A URL outside the allow-list is refused |
| 9 | Add the headless browser worker. It renders allow-listed pages only, in the sandbox, without a credential | `workers/web-worker/` | A page that needs a login is not fetched |
| 10 | Expose the first MCP server in the calendar service | `services/calendar-service/mcp/` | A call without a provider token fails |
| 11 | Expose the MCP servers of the inbox, finance, trips, WhatsApp and Telegram services | each service | Each server lists only its own tools |
| 12 | Write the MCP security suite: forged JWT, wrong audience, missing scope, viewer write, tool shadowing, replay, oversize | `tests/red-team/` | Every case is denied |
| 13 | Put the MCP surface inside the scope lock allow-list | `04-scope-lock` | A new tool family is refused until it is registered |
| 14 | Write the design note that records the deviation from spec:503 and spec:504 | `docs/design-notes/` | The note names both spec lines |

## Build order

Work these steps in order. A step names tasks from the table above.

1. Write the contract and the server library, then the client. No tool exists before the contract does.
2. Add the roles and the tool bindings, then the approval and the audit.
3. Add the fetch tool and the browser worker, then the first MCP server.
4. Expose the remaining servers, then run the security suite.

## Acceptance tests

- `test_mcp_call_without_service_jwt_rejected` — an unauthenticated tool call fails before any provider call.
- `test_mcp_wrong_audience_rejected` — a service JWT minted for another server fails.
- `test_mcp_missing_scope_rejected` — a call without the required scope fails the policy decision.
- `test_viewer_cannot_call_a_write_tool` — the `viewer` role cannot call a write tool.
- `test_unregistered_tool_rejected` — a call to a tool that no server lists fails before policy.
- `test_tool_shadowing_rejected` — a tool that claims another server's name fails.
- `test_mcp_call_audited` — every call has one audit row with the reason code.
- `test_fetch_outside_allow_list_refused` — the fetch tool refuses a URL that no source permits.
- `test_browser_refuses_a_login_page` — the browser worker does not fetch a page that needs a credential.
- `test_consequential_call_needs_bound_approval` — a consequential call without its approval fails.

## Risks

- MCP replaces the registry, so the checks that module 03 and module 04 hold move onto the MCP side. A gap there is a scope hole.
- One server per service keeps the permission boundary at the service boundary. A shared server would hold every provider credential.
- The browser worker reaches the network. It stays sandboxed, it holds no credential, and it fetches allow-listed pages only.
- A viewer role that grows into a second admin is a common failure. The policy service decides the role per tool family, and the audit records every decision.
