# Module 03 — Agent runtime and tool registry

Phase P4. Spec headings: Request lifecycle, Agent Runtime & Tool Registry, Agent workflow and execution policy, Agentic and tool-calling protocol.

## Goal

The agent is a workflow coordinator. It proposes. It never decides. A typed plan passes schema validation, then policy, then approval, then execution, then independent verification, then audit.

## Constraints (spec, binding)

Each bullet names the spec line it quotes. Quote marks mean verbatim text.

- Spec:147: "The model is never permitted to choose arbitrary URLs, SQL, shell commands or filesystem paths as executable instructions."
- Spec:165: "The `requires_approval` field above is illustrative output only; the policy service recomputes this requirement and can override it."
- Spec:172: "A model response alone must never transition a workflow to `succeeded`."
- Spec:173: "Non-idempotent actions are not automatically retried unless the provider supports idempotency or the system first verifies the operation did not happen."
- Bounds: 6 steps per plan, 5 orchestration turns, 30 seconds per model call, one repair attempt for malformed output.
- States: `planned`, `awaiting_approval`, `approved`, `executing`, `succeeded`, `failed`, `cancelled`, `needs_manual_action`.

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Define the tool registry schema: `tool_id`, version, Pydantic in/out, owning service, task family, scopes, risk tier, idempotency, verifier | `services/agent-orchestrator/registry/` | Unknown field fails validation | 6 |
| 2 | Register 8 read-only tools first: list inbox, read event, list tasks, search notes, list transactions, list openings, get profile, get audit | registry + schemas | Registry rejects an unregistered tool | 6 |
| 3 | Register 6 write tools: draft email, create event, create task, create note, import statement, draft application | registry + schemas | Each write tool carries a risk tier | 6 |
| 4 | Register 3 consequential tools: send email, submit application, connect account | registry + schemas | Each forces an approval | 4 |
| 5 | Build the deterministic router from natural language to a task-family enum | `orchestrator/router/` | Out-of-scope text returns a fixed refusal | 6 |
| 6 | Build the model gateway: provider allow-list, request shaping, redaction, timeout, quota | `services/model-gateway/` | Timeout and quota tests pass | 8 |
| 7 | Add Ollama as the default provider with a pinned digest | gateway config | Gateway rejects an unlisted model | 4 |
| 8 | Implement the LangGraph state machine with a checkpointer | `orchestrator/workflows/` | Pause and resume restore exact state | 8 |
| 9 | Put `interrupt()` before every consequential step | workflow code | No side effect runs before approval | 6 |
| 10 | Add the step bounds and the overall deadline | workflow config | A 7-step plan is rejected | 4 |
| 11 | Implement one repair attempt on malformed output, then stop | orchestrator | Two failures end the run safely | 4 |
| 12 | Build the verifier layer that checks provider IDs and persisted state | `orchestrator/verify/` | Fabricated receipt is rejected | 8 |
| 13 | Return-value validation: reject unknown enums, out-of-scope IDs, stale jobs | validators | Each rejection case has a test | 6 |
| 14 | Emit audit events at every state change | orchestrator | Every transition has one audit row | 4 |
| 15 | Add a deterministic fake model for tests | `tests/fixtures/` | Full workflow runs with no LLM | 5 |
| 16 | Implement cancellation where safe | orchestrator | Cancelled run leaves no partial write | 4 |
| 17 | Add per-user quotas and cost accounting | gateway | Quota exceeded returns a typed error | 4 |
| 18 | Deliver curriculum lab 4: LangGraph stub workflow with an injected hallucination | `labs/lab04/` | The validator catches the injected lie | 5 |
This build sequence sums to 98 hours.

## Build order

Work these steps in order. A step names tasks from the table above. At 30 hours per week a phase spans several weeks, so a step may run into the next week.

1. Define the tool registry and register the read-only tools.
2. Build the deterministic router and the refusal path.
3. Reuse the P3 fake model and run the router-to-refusal path end to end, with no LLM.

## Acceptance tests

- `test_unregistered_tool_rejected` — a plan naming an unknown tool fails before policy.
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
