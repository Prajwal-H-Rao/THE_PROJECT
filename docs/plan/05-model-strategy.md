# Module 05 — Model strategy and local inference

Phase P3. Spec headings: local model strategy, candidate shortlist, inference repos, dev commands, tool-calling protocol, eval gate.

## Goal

Pick the smallest local model that clears a measured quality floor on NOVA's own tools. P3 configures the local runtime. P4 puts the same runtime behind the model gateway. Never trust a model because it is local.

## Hardware envelope

16 GiB system RAM, i5-class CPU, 4 GiB NVIDIA laptop GPU. Treat as a sizing assumption, not a guarantee. Benchmark on the machine that runs NOVA.

## Constraints (spec, binding)

Each bullet names the spec line it quotes. Quote marks mean verbatim text.

- Spec:423: "No model is trusted solely because it is local, quantized or popular."
- Spec:496: "Do not infer that a catalogue's advertised 256K context is feasible on commodity hardware."
- Spec:423: "Keep model access behind the gateway."
- Spec:506: "The same tool contracts must work with a deterministic fake model, the chosen local model, and any explicitly enabled remote provider."
- Start at 4K context and one concurrent generation.

## Verified claims

See `claims-ledger.md` C01 to C06. Re-check on P3 day 1, before task 1.

## Candidate table

| Role | Candidate | Artifact | Decision |
|---|---|---|---|
| Primary planner | `qwen3.5:2b` | 2.7-3.1 GB | Default start |
| Stronger planner | `qwen3.5:4b-q4_K_M` | 3.3-4.0 GB | Test if 2b misses the floor |
| Classifier only | `qwen3.5:0.8b` | 1.2-1.3 GB | Never the planner for writes, finance, qualifications or submission |
| Not in the spec, added | `qwen3.5:9b` | 6.6-7.6 GB | Fits 16 GiB RAM. Test if 4b misses the floor and latency allows |
| Embeddings | `BAAI/bge-small-en-v1.5` | 133 MB | English baseline |
| Embeddings multilingual | `intfloat/multilingual-e5-small` | larger | Test on Hindi and Kannada |

The spec's `Qwen3-4B-Instruct-2507` and `SmolLM3-3B` need template compatibility checks. Treat as optional comparisons, not defaults.

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Write a repeatable setup script: pull, pin digest, record size and license | `models/setup.sh` | Script reproduces the same digest | 4 |
| 2 | Create `model_registry.yaml` with provider, ID, digest, quant, license, template version, `num_ctx`, latency, peak RAM/VRAM, eval date | `models/` | Registry validates against a schema | 4 |
| 3 | Bind Ollama to loopback and the private container network only | Compose config | Public port scan fails | 3 |
| 4 | Pin the model tag and digest in deployment config | Compose config | Drift fails CI | 2 |
| 5 | Set 4K context, one concurrent generation and a low output limit on the model runtime | Ollama and llama.cpp config | A second concurrent request is rejected by the runtime | 3 |
| 6 | Measure CPU-only and GPU-assisted runs separately | eval report | The report has a CPU block and a GPU block, each with peak RAM and p95 | 5 |
| 7 | Build the 250-case evaluation set: supported tasks, ambiguity, out-of-scope, wrong tool, invalid args, injection, multilingual, multi-turn | `tests/model-eval/` | Set has 250 cases and a manifest | 12 |
| 8 | Score exact tool-name accuracy and per-field argument accuracy | eval runner | Report per case and worst slice | 6 |
| 9 | Score schema rejection rate and out-of-scope false-tool-call rate | eval runner | The report prints both rates as numbers | 4 |
| 10 | Record latency p50 and p95 plus peak VRAM and RAM | eval runner | Every candidate row carries all four numbers | 4 |
| 11 | Decide and record the default with its reasoning | registry | The decision names one candidate and one eval run ID that exists | 3 |
| 12 | Test llama.cpp as the fallback runtime | eval report | Same contracts hold | 6 |
| 13 | Test the `0.8b` for classification only, and fence it from the tool registry | Compose network plus config | The `0.8b` container has no route to the tool registry port | 4 |
| 14 | Add a deterministic fake model as the CI default, which `03-agent-runtime` reuses in P4 | `tests/fixtures/` | CI needs no GPU | 3 |
| 15 | Deliver curriculum lab 11: three-model benchmark on identical fixtures | `labs/lab11/` | The report records RAM, VRAM and p95 for each model | 6 |
This build sequence sums to 69 hours.

## Release thresholds

- 100 percent of unauthorised or out-of-scope tool proposals blocked by deterministic enforcement. This is policy, not model quality.
- At least 98 percent well-formed tool envelopes on the supported set after at most one repair.
- A declared task-success rate on the manually reviewed set.
- No claim of broad safety from this benchmark.

If a candidate misses the tool-choice target, simplify the workflow or use deterministic routing. Do not weaken authorisation.

## Build order

Work these steps in order. A step names tasks from the table above. At 30 hours per week a phase spans several weeks, so a step may run into the next week.

1. Write the setup script and `model_registry.yaml`.
2. Build the 250-case evaluation set.
3. Run 2b and 4b. Record both. Decide.

## Acceptance tests

- `test_registry_schema_complete` — a row missing digest, quant, licence, `num_ctx` or eval date fails.
- `test_ollama_not_public` — a request to the model port from outside the private network fails.
- `test_context_capped_at_4k` — the model runtime rejects a request above the configured `num_ctx`. `03-agent-runtime` repeats the check at the gateway in P4.
- `test_eval_set_has_250_cases` — a count below 250 fails the runner.
- `test_false_tool_call_rate_reported` — the report contains a number for out-of-scope false calls.
- `test_decision_cites_existing_run` — the default model names an eval run ID that resolves.
- `test_08b_cannot_reach_write_tools` — the classification model container has no route to the tool registry port.
- `test_ci_runs_without_gpu` — the evaluation job passes on a machine with no GPU.

## Risks

- No ledger row justifies a model choice. Only the 250-case evaluation gate does (spec:510). Run it before you set a default.
- The 9b model was not in the spec. Add it only if 4b fails and latency allows.
- Model cards and tags change. Re-check the ledger on the first day of P3 and again before any swap.
