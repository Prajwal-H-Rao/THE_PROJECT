# 2026-10-21 — Name the MCP surface in the spec

## Goal

Change the spec itself. The product owner chose the MCP surface over the tool registry, so the spec, the plan, the record, the coverage map and the diagrams must all name it.

## What changed in the spec

- The logical architecture diagram now shows the MCP surface between the agent and the domain services. The note under the diagram states that every external action reaches its owning service through that service's MCP server.
- The request lifecycle now says that the orchestrator reaches every tool through the MCP client, and that the owning service's MCP server verifies the approval token and executes with its own credential.
- The service communication section gained a bullet on the MCP server: it validates the arguments, checks the caller's identity and scope, and records the decision.
- The heading `Agent Runtime & Tool Registry` is now `Agent Runtime, MCP Surface & Tool Catalogue`.
- The workflow sentence names the MCP tool call, and the tool definition now lives in the MCP tool catalogue.
- The allowed task families now map to the tools that the MCP surface exposes.
- The prompt-injection rule names the tool catalogue.
- The authorization rule now names three roles: `admin`, `user` and `viewer`. A viewer may read but not write.
- The technology table gained a `Tool surface` row. The choice is MCP servers, one per owning service, with a shared tool catalogue.
- The bounded tool definitions rule now defines each tool once in the MCP tool catalogue, names the owning service and its MCP server, and keeps the no-arbitrary-URL rule. The bounded fetch tool and the headless browser worker are named as the only ways to reach the network.
- The model and inference sandbox may hold no MCP client.
- The curriculum gained lab 13: MCP surface and tool authorization.

## What changed in the plan

- Every `spec:` and `Spec:` citation in the plan, the coverage map and the record was remapped to the new spec line numbers. The remap was scripted, so no citation was hand-edited.
- The two plain line references in the plan were remapped too.
- `docs/plan/20-pages-and-automations.md`: the RBAC quote now matches the spec.
- The heading name changed in module 03, module 21 and the coverage map.
- The deferred spec items in the checker moved with the spec.

## What changed in the checker

- Added `nova/tests/layout/plan_checks.py`. Check AB verifies that every plan citation resolves and that every quoted spec string still sits, word for word in order, on a line that the plan cites.
- The check found one stale quote, the RBAC line that the spec change broke. It was fixed.
- The check treats a truncated quote as valid. The plan quotes a fragment of a long spec line, and the fragments are accurate. A renamed or removed word fails.

## Verification

- The spec holds 1546 lines and 74 fence-aware headings. The heading count is unchanged.
- All 685 plan and record citations resolve. Every quoted string sits on a cited line.
- `python3 nova/tests/layout/check_layout.py` passes all 28 checks.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 64 mutations. The four acceptance scenarios pass.
- `ruff check .` passes. `mypy nova/tests/layout` passes on the 22 checker modules.
- Every plan file stays under 200 lines.

## Open items

- The design note for the change from the registry wording is written by module 19 task 4.
- The plan states that the spec is the source of truth. The spec now names the MCP surface, so the plan and the spec agree.
