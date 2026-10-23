# LLM/Model Provider

## Chosen (spec:425)

**Qwen3.5 2B/4B quantized through Ollama or llama.cpp; optional approved cloud provider**

## Rationale

- Hardware-first local shortlist: start with `qwen3.5:2b` on commodity hardware, test `qwen3.5:4b-q4_K_M` with CPU/GPU offload if memory budget allows, reserve `qwen3.5:0.8b` for simple low-risk classification.
- Compare each candidate on NOVA-specific tool-call, JSON-schema, multilingual and injection fixtures before selection.
- Pin exact digests/versions, set a small context/output quota, and keep model access behind the gateway.
- No model is trusted solely because it is local, quantized, or popular.

## Rejected

| Option | Reason |
|--------|--------|
| Choosing a model by hype | Popularity does not correlate with NOVA-specific performance on tool-calling and structured output tasks. |
| Trusting a local model without measuring it | Every model must pass the NOVA evaluation fixtures (tool-call accuracy, JSON schema adherence, injection resistance) before deployment. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row. Model landscape changes rapidly.