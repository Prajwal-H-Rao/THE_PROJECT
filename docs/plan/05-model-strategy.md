# Module 05 — Model strategy and local inference

Phase P3. Spec headings: local model strategy, candidate shortlist, inference repos, dev commands, tool-calling protocol, eval gate.

## Goal

Pick the smallest local model that clears a measured quality floor on NOVA's own tools. P3 configures the local runtime. P5 puts the same runtime behind the model gateway. Never trust a model because it is local.

The route picks the model per task family. A lightweight family uses the smallest model that clears the floor. A major family uses the larger model. The orchestration of the agent runtime runs in Python with LangGraph, and it asks the model gateway for the model of the tier. LangChain holds the provider and tool adapters where they remove boilerplate. No step uses one model for everything.

## Hardware envelope

16 GiB system RAM, i5-class CPU, 4 GiB NVIDIA laptop GPU. Treat as a sizing assumption, not a guarantee. Benchmark on the machine that runs NOVA.

## Constraints (spec, binding)

Each bullet names the spec line it quotes. Quote marks mean verbatim text.

- Spec:425: "No model is trusted solely because it is local, quantized or popular."
- Spec:499: "Do not infer that a catalogue's advertised 256K context is feasible on commodity hardware."
- Spec:425: "Keep model access behind the gateway."
- Spec:509: "The same tool contracts must work with a deterministic fake model, the chosen local model, and any explicitly enabled remote provider."
- Spec:17: "Prefer LangGraph when durable multi-step state, retries, pauses for approval, and human-in-the-loop continuation are needed; use LangChain abstractions when they simplify provider/tool integration. Neither framework is a security boundary."
- Start at 4K context and one concurrent generation.

## Verified claims

See `claims-ledger.md` C01 to C06. Re-check before the first P3 task.

## Candidate table

| Role | Candidate | Artifact | Decision |
|---|---|---|---|
| Primary planner | `qwen3.5:2b` | 2.7-3.1 GB | Default start |
| Stronger planner | `qwen3.5:4b-q4_K_M` | 3.3-4.0 GB | Test if 2b misses the floor |
| Classifier only | `qwen3.5:0.8b` | 1.2-1.3 GB | Never the planner for writes, finance, qualifications or submission |
| Not in the spec, added | `qwen3.5:9b` | 6.6-7.6 GB | Fits 16 GiB RAM. Test if 4b misses the floor and latency allows |
| Embeddings | `BAAI/bge-small-en-v1.5` | 133 MB | English baseline |
| Embeddings multilingual | `intfloat/multilingual-e5-small` | larger | Test on Hindi and Kannada |

The spec's `Qwen3-4B-Instruct-2507` and `SmolLM3-3B` need template compatibility checks. Spec:695 requires at least one alternative alongside the three Qwen sizes. Treat them as required benchmark entries, not defaults.

## Build sequence

| # | Task | Artifact | Test |
|---|---|---|---|
| 1 | Write a repeatable setup script: pull, pin digest, record size and license | `models/setup.sh` | Script reproduces the same digest |
| 2 | Create `models/model-registry.yaml` at the spec:961 path. Add provider, ID, digest, quant, licence, template, `num_ctx`, latency, RAM/VRAM, hardware, tool-call quality and eval date. | `models/` | Registry validates against a schema |
| 3 | Bind Ollama to loopback and the private container network only | Compose config | Public port scan fails |
| 4 | Pin the model tag and digest in deployment config | Compose config | Drift fails CI |
| 5 | Set 4K context, one concurrent generation and a low output limit on the model runtime | Ollama and llama.cpp config | A second concurrent request waits in queue order and never runs in parallel |
| 6 | Measure CPU-only and GPU-assisted runs separately | eval report | The report has a CPU block and a GPU block, each with peak RAM and p95 |
| 7 | Build the 250-case evaluation set: supported tasks, ambiguity, out-of-scope, wrong tool, invalid args, injection, multilingual, multi-turn | `tests/model-eval/` | Set has 250 cases and a manifest |
| 8 | Score exact tool-name accuracy and per-field argument accuracy | eval runner | Report per case and worst slice |
| 9 | Score schema rejection rate and out-of-scope false-tool-call rate | eval runner | The report prints both rates as numbers |
| 10 | Record latency p50 and p95 plus peak VRAM and RAM | eval runner | Every candidate row carries all four numbers |
| 11 | Decide and record the default with its reasoning | registry | The decision names one candidate and one eval run ID that exists |
| 12 | Test llama.cpp as the fallback runtime | eval report | Same contracts hold |
| 13 | Test the `0.8b` for classification only. Fence it from the MCP surface that `21-mcp-surface` binds in P5. Use a dummy listener in P3. | Compose network plus config | A dummy listener on the MCP port is unreachable from the `0.8b` container |
| 14 | Add a deterministic fake model as the CI default, which `03-agent-runtime` reuses in P5 | `tests/fixtures/` | CI needs no GPU |
| 15 | Deliver curriculum lab 11: four-model benchmark on identical fixtures, the `0.8b`, the `2b` and the `4b-q4_K_M`, plus at least one alternative | `labs/lab11/` | The report records RAM, VRAM and p95 for all four models (spec:695) |
| 16 | Define the model routing policy: every task family names the model tier it uses. A lightweight family uses the smallest model that clears the floor. A major family uses the larger model. The policy is deterministic and the registry holds it. `03-agent-runtime` reads it. | `models/model-registry.yaml` | Every task family names a tier, and a family that writes, handles finance, qualifications or submission never names the classifier-only model |
## Release thresholds

- 100 percent of unauthorised or out-of-scope tool proposals blocked by deterministic enforcement. This is policy, not model quality.
- At least 98 percent well-formed tool envelopes on the supported set after at most one repair.
- A declared task-success rate on the manually reviewed set.
- No claim of broad safety from this benchmark.

If a candidate misses the tool-choice target, simplify the workflow or use deterministic routing. Do not weaken authorisation.

## Build order

Work these steps in order. A step names tasks from the table above.

1. Write the setup script, `models/model-registry.yaml` and the routing policy (tasks 1, 2 and 16).
2. Build the 250-case evaluation set.
3. Run 2b and 4b. Record both. Decide.

## Acceptance tests

- `test_registry_schema_complete` — a row missing digest, quant, licence, `num_ctx`, tested hardware, tool-call quality or eval date fails.
- `test_ollama_not_public` — a request to the model port from outside the private network fails.
- `test_context_capped_at_4k` — a request above the configured `num_ctx` returns within the context bound, with no error and no hang. `03-agent-runtime` adds the truncation marker at the gateway in P5 and repeats the check there.
- `test_eval_set_has_250_cases` — a count below 250 fails the runner.
- `test_false_tool_call_rate_reported` — the report contains a number for out-of-scope false calls.
- `test_decision_cites_existing_run` — the default model names an eval run ID that resolves.
- `test_08b_cannot_reach_write_tools` — a dummy listener on the MCP port is unreachable from the `0.8b` container. `21-mcp-surface` repeats the check against the live surface in P5.
- `test_ci_runs_without_gpu` — the evaluation job passes on a machine with no GPU.
- `test_every_task_family_names_a_model_tier` — a family without a tier fails, and a family that writes, handles finance, qualifications or submission never names the classifier-only model. `03-agent-runtime` reads the same policy at the router in P5.

## Risks

- No ledger row justifies a model choice. Only the 250-case evaluation gate does (spec:513). Run it before you set a default.
- The 9b model was not in the spec. Add it only if 4b fails and latency allows.
- Model cards and tags change. Re-check the ledger before the first P3 task and again before any swap.
