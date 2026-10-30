# 2026-10-30: Module 04 task 5 — Layer 3 constrained planning

## Summary

Implemented Layer 3 of Module 04 scope lock: constrained planning over enumerated tool IDs. The model proposal is a proposal (spec:202) only. Plans outside the catalogue are denied before execution.

## Approach review

Two negation subagents reviewed the approach and forced corrections. Key ones:

1. No new workflow states. An 8-state `WorkflowState` enum is a binding constraint (Module 03). A denial is `failed` plus a typed code reusing the MCP error vocabulary (`tool_not_found`, `invalid_arguments`, `schema_mismatch`).
2. `WorkflowStateData.from_dict` mapped unknown state strings back to `planned` — a fail-open path through the checkpointer that could resurrect a denied plan. Now unknown state rehydrates as `failed` with `last_error` set.
3. The routed family reaches `plan_node` through `metadata`; the join is the operation-id family prefix against `metadata.routed_family` (fallback: `initial_action` prefix). Router action names never invent operations — 17 table actions have no catalogue operation and must deny, not infer.
4. No content regexes. Prose fields (`body`, `title`, `cover_letter`, `message`, `data`, ...) stay on layers 6 and 7. The deny-value guard runs only on command-target fields (`query`, `source`, `origin`, `destination`, `location`, `recipient`, `*_id`). Row-5's "arbitrary URL or SQL in args fails" holds by schema rejection of undeclared fields plus that guard.
5. Catalogue loading is a function with a typed `CatalogueError`, not an import-time raise. Catalogue JSONs are the single truth; the fake model mirror is trimmed to the same 17 operations and a parity test locks them together.
6. `add_conditional_edges` raises on an unmapped key, so "no fall-through" is an in-code `else → finalize`. `decide_node` early-returns on terminal states so it can never reset `failed` to `approved`.

Both negators then signed off with these corrections applied.

## Changes

### `orchestrator/workflows/tool_catalogue.py` (new, 107 lines)

- `load_tool_catalogue()`: loads all 7 family JSONs, validates family against the contracts mirror `CANONICAL_FAMILY_VALUES`, checks `<family>.<name>` ids, uniqueness, and object-typed argument schemas. `CatalogueError` carries the MCP denial code. Family join helper `load_catalogue_families()`.

### `orchestrator/workflows/plan_validation.py` (new, 134 lines)

- `validate_step()` / `validate_plan()`: tool must be enumerated; tool must belong to the routed family; arguments validated fail-closed against the catalogue schema (required fields, unknown fields rejected, type checks, array item type); command-target values scanned for URL, SQL, or chained-command patterns; prose content never scanned.

### `orchestrator/workflows/state.py`

- `from_dict` fails closed: unknown state string → `failed` + `last_error`.

### `orchestrator/workflows/nodes.py`

- `plan_node`: scenario reads `metadata.scenario` (was hardcoded happy_path); after step building, `validate_plan` runs with the routed family from metadata. A denial returns a `failed` workflow with `code: detail` in `last_error`; steps and execution never start.
- `decide_node`: terminal states return early, no policy simulation reset.

### `orchestrator/workflows/graph.py`

- `route_after_plan`: explicit `planned → decide`, everything else `finalize`. Edges wired as conditional, so a `failed` plan never reaches `execute`.

### `orchestrator/workflows/__init__.py`

- `run_workflow` gains an optional `scenario` parameter, stored in metadata (default `happy_path`; API boundary unchanged).

### `tests/fixtures/fake-model/fake_model.py`

- `TOOL_CATALOGUE` trimmed to the 17 catalogue operations (removed `finance.categorize`, `resume_jobs.match`).
- `finance.import` arguments now carry the required `account_id`; `trips.read` no longer carries the undeclared `date`.

### `orchestrator/workflows/test_layer3.py` (new, 16 tests)

Happy path passes; un-enumerated tool, family mismatch, non-object arguments, extra field, URL in command target, SQL in query, shell chain — all denied with typed codes; prose content not scanned; missing catalogue fails closed; fake-model/catalogue parity; unknown-state rehydrate fails closed; plan routing fails closed; scenario plumbing; happy path survives; family join complete.

## Verification

- Layer 3: 16/16. Orchestrator 5/5. Router 17/17. Fake model 8/8.
- End-to-end graph run through the new plan edge: `succeeded`, 1 step.
- Model gateway 7/7, model registry 6/6.
- Layout checker run at the end of the change.

## Not in this task

- Layer 4 deterministic authorization, layer 5 action-scoped grants, and the red-team suite: Module 04 tasks 6-7 and 13+.
