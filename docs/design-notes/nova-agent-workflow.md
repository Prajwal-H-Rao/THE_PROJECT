# Agent Workflow

## Chosen (spec:434)

**LangGraph (Python) where useful; LangChain selectively**

## Rationale

- State graphs, retries, checkpointing, and human approval pauses are useful for long workflows.
- Start with a small deterministic state machine if that meets the scope.
- Avoid abstraction for simple CRUD.

## Rejected

| Option | Reason |
|--------|--------|
| Raw LLM loops | No structure, no retry logic, no checkpointing, no human-in-the-loop. Unacceptable for consequential actions requiring approval and audit. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row. LangGraph/LangChain APIs evolve rapidly.