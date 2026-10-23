# Model Gateway

## Chosen (spec:437)

**Ollama locally; optional provider adapter/LiteLLM**

## Rationale

- Normalizes calls, model allow-list, timeouts, quotas, and redaction.
- Provider choice is configuration.
- Gateway does not remove the need for sandboxing or output verification.

## Rejected

| Option | Reason |
|--------|--------|
| Direct provider calls | Scatters provider logic across services. No centralized allow-list, quota enforcement, or redaction. Harder to audit and control. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row. Model provider APIs and pricing change frequently.