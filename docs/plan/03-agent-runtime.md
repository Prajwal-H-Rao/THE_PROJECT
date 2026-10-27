# Module 03 — Agent runtime and MCP client

Phase P5. Spec headings: Request lifecycle, Agent Runtime, MCP Surface & Tool Catalogue, Agent workflow and execution policy, Agentic and tool-calling protocol.

## Goal

The agent is a workflow coordinator. It proposes. It never decides. A typed plan passes schema validation, then policy, then approval, then execution, then independent verification, then audit.

## Constraints (spec, binding)

Each bullet names the spec line it quotes. Quote marks mean verbatim text.

- Spec:149: "The model is never permitted to choose arbitrary URLs, SQL, shell commands or filesystem paths as executable instructions."
- Spec:167: "The `requires_approval` field above is illustrative output only; the policy service recomputes this requirement and can override it."
- Spec:174: "A model response alone must never transition a workflow to `succeeded`."
- Spec:175: "Non-idempotent actions are not automatically retried unless the provider supports idempotency or the system first verifies the operation did not happen."
- Spec:17: "Prefer LangGraph when durable multi-step state, retries, pauses for approval, and human-in-the-loop continuation are needed; use LangChain abstractions when they simplify provider/tool integration. Neither framework is a security boundary."
- Spec:147: "Use LangChain only for useful provider/tool adapters; keep core authorization and execution code framework-independent."
- Bounds: 6 steps per plan, 5 orchestration turns, 30 seconds per model call, one repair attempt for malformed output.
- States: `planned`, `awaiting_approval`, `approved`, `executing`, `succeeded`, `failed`, `cancelled`, `needs_manual_action`.

## Build sequence

| # | Task | Artifact | Test |
|---|---|---|---|
| 1 | Register the tools against the MCP tool definition that `21-mcp-surface` wrote in task 1 | `packages/contracts/mcp/` | Unknown field fails validation |
| 2 | Register 8 read-only tools: list inbox, read event, list tasks, search notes, list transactions, list openings, get profile, get audit | MCP tool catalogue | The catalogue rejects an unregistered tool |
| 3 | Register 6 write tools: draft email, create event, create task, create note, import statement, draft application. Enumerate the full operation set for each of the 7 families per spec:195 | MCP tool catalogue | Each write tool carries a risk tier, and every family has an enumerated operation set |
| 4 | Register 3 consequential tools: send email, submit application, connect account | MCP tool catalogue | Each forces an approval |
| 5 | Build the deterministic router from natural language to a task-family enum, then to the model tier of that family | `services/agent-orchestrator/orchestrator/router/` | Out-of-scope text returns a fixed refusal, and the router never names a tier that the registry forbids |
| 6 | Build the model gateway: provider allow-list, request shaping, redaction, timeout, quota, and the model of the tier | `services/model-gateway/` | Timeout, quota and `num_ctx` truncation-marker tests pass |
| 7 | Add Ollama as the default provider with a pinned digest | gateway config | Gateway rejects an unlisted model |
| 8 | Implement the LangGraph state machine with a checkpointer | `services/agent-orchestrator/orchestrator/workflows/` | Pause and resume restore exact state |
| 9 | Put `interrupt()` before every consequential step | workflow code | No side effect runs before approval |
| 10 | Add the step bounds and the overall deadline | workflow config | A 7-step plan is rejected |
| 11 | Implement one repair attempt on malformed output, then stop | orchestrator | Two failures end the run safely |
| 12 | Build the verifier layer that checks provider IDs and persisted state | `services/agent-orchestrator/orchestrator/verify/__init__.py` | Fabricated receipt is rejected |
| 13 | Return-value validation: reject unknown enums, out-of-scope IDs, stale jobs | `services/agent-orchestrator/orchestrator/validators/__init__.py` | Each rejection case has a test |
| 14 | Emit audit events at every state change | orchestrator | Every transition has one audit row |
| 15 | Wire the deterministic fake model that `05-model-strategy` added in P3, and add the scenario fixtures the workflow needs | `tests/fixtures/` | Full workflow runs with no LLM |
| 16 | Implement cancellation where safe | orchestrator | Cancelled run leaves no partial write |
| 17 | Add per-user quotas and cost accounting | gateway | Quota exceeded returns a typed error |
| 18 | Deliver curriculum lab 4: LangGraph stub workflow with an injected hallucination | `labs/lab04/` | The validator catches the injected lie |
| 19 | Build the Flask API boundary for plan/cancel/resume | `services/agent-orchestrator/api/app.py`, `services/agent-orchestrator/requirements.txt` | Service token verification on all routes |
## Build order

Work these steps in order. A step names tasks from the table above.

1. Define the MCP tool definition and register the read-only tools.
2. Build the deterministic router and the refusal path.
3. Reuse the P3 fake model and run the router-to-refusal path end to end, with no LLM.

## Acceptance tests

- `test_unregistered_tool_rejected` — a plan naming an unknown tool fails before policy.
- `test_tool_call_goes_through_the_mcp_client` — the orchestrator reaches a tool only through the MCP client. `21-mcp-surface` owns the client.
- `test_out_of_scope_gets_fixed_refusal` — the router never forwards out-of-scope text to the planning model.
- `test_interrupt_blocks_side_effect` — no domain write happens before the interrupt returns.
- `test_model_cannot_mark_succeeded` — a model claim of success does not change state.
- `test_fabricated_receipt_rejected` — a receipt ID that does not resolve fails verification.
- `test_seventh_step_rejected` — the bound holds.
- `test_malformed_output_two_failures_stop` — the second failure ends the run.

## Risks

- LangGraph re-runs side effects before `interrupt()` on resume. Keep every side effect after the interrupt, and make every tool idempotent.
- The 30-second model call limit may be tight for a 4B model on CPU. Measure in P3 and raise only with evidence.
- The router is not a security control. Policy is. Never treat a router miss as a denial.
