# 2026-10-21 — Name the MCP surface in the spec

## Goal

Change the spec itself. The product owner chose the MCP surface over the tool registry, so the spec, the plan, the record, the coverage map and the diagrams must all name it.

## What changed in the spec

- The logical architecture diagram shows the MCP surface between the agent and the domain services. The note under the diagram states that the MCP surface is the set of servers that the owning services run, and that it is not a separate process.
- The request lifecycle says that the orchestrator reaches every tool through the MCP client, and that the owning service's MCP server verifies the approval token and executes with its own credential.
- The service communication section gained a bullet on the MCP server: it validates the arguments, checks the caller's identity and scope, validates the action grant and the acting user's role, and records the decision. A write without a valid grant fails.
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

- Every `spec:` and `Spec:` citation in the plan, the coverage map and the layout diff record was remapped with a script. The remap moved the start of every range and the end of every range.
- The bare line references in the plan were remapped too: the two in the module text, the sixteen technology rows in module 19 and the ten rows of the unheaded content table in the coverage map.
- `docs/plan/20-pages-and-automations.md`: the RBAC quote now matches the spec.
- The heading name changed in module 03, module 21 and the coverage map.
- The deferred spec items in the checker moved with the spec.
- Module 19 gained the `Tool surface` technology row and the thirteenth lab. The lab counts moved from twelve to thirteen in module 19 and in the phase order rules.
- Module 21 was rewritten. It gained the grant check, the role issuance, the stub wording for the services that do not exist at P5, the browser allow-list test, the lab task and the design note task. The scope lock task moved to module 04, which owns that artifact.
- Module 03 task 1 registers the tools against the contract that module 21 wrote. One module owns the contract.
- Module 07 task 17 and module 20 task 17 name three roles.
- Module 17 task 9 names the browser worker in the egress allow-list.
- The coverage map names module 21 as a second owner of the service communication, the allowed task families, the security rules and the curriculum headings.

## What changed in the checker

- Added `nova/tests/layout/plan_checks.py`. Check AB verifies that every plan citation resolves, that every quoted spec string still sits, word for word in order, on a line that the plan cites, and that a range citation holds as many lines as the count the plan states next to it.
- The range rule found the defect the first remap left: every range citation had lost its last line. The counts in the plan contradicted their own ranges.
- Two mutations prove check AB: a narrowed range citation and a renamed word inside a quote.
- The typecheck scope now covers `nova`, so the template is typechecked too. The workflow, the tool config and the check that compares the two scopes moved together.

## Verification

- The spec holds 1546 lines and 74 fence-aware headings. The heading count is unchanged.
- All 711 plan and record citations resolve. Every quoted string sits on a cited line. Every range citation holds the count the plan states.
- `python3 nova/tests/layout/check_layout.py` passes all 28 checks.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 66 mutations. The four acceptance scenarios pass.
- `ruff check .` passes. `mypy nova` passes on the 27 Python modules.
- Every plan file stays under 200 lines.

## Open items

- The design note for the change from the earlier registry wording is written by module 19 task 4.
- The plan states that the spec is the source of truth. The spec now names the MCP surface, so the plan and the spec agree.
