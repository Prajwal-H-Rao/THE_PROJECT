# Claims ledger

External facts this plan depends on. I fetched each source on 2026-10-12. Provenance is `user-research` unless stated.

## Status values

- `verified` — fetched on the date in `Verified on`. Polling or building may proceed.
- `stale` — past `Recheck before`. A stale row blocks its dependent phase. A new fetch lifts the block.
- `unverifiable` — no reachable official source. The dependent task runs at reduced capability.
- `superseded` — a newer fact replaced it.
- `evaluated-rejected` — checked and judged not to fit NOVA.

## Rule

Only `verified` permits automated polling. A `stale` or `unverifiable` claim forces the connector task to `manual_only`. Each `Recheck before` date is a verification deadline. Re-check the row before the dependent module's first task.

## Ledger

| ID | Claim | Source | Status | Verified on | Recheck before | Dependent module |
|---|---|---|---|---|---|---|
| C01 | Ollama lists `qwen3.5` with a `tools` tag at 0.8b, 2b, 4b, 9b, 27b, 35b, 122b | https://ollama.com/library/qwen3.5 | verified | 2026-10-12 | 2026-11-25 | `05-model-strategy` (P3) |
| C02 | `qwen3.5:2b` is 2.7-3.1 GB. `4b` is 3.3-4.0 GB. `0.8b` is 1.2-1.3 GB. `9b` is 6.6-7.6 GB | https://ollama.com/library/qwen3.5/tags | verified | 2026-10-12 | 2026-11-25 | `05-model-strategy` (P3) |
| C03 | Tag `qwen3.5:4b-q4_K_M` exists and is a valid pull target | https://ollama.com/library/qwen3.5:4b-q4_K_M | verified | 2026-10-12 | 2026-11-25 | `05-model-strategy` (P3) |
| C04 | Qwen3.5 advertises 256K context. Feasibility on 4 GB VRAM is not implied | https://ollama.com/library/qwen3.5 | verified | 2026-10-12 | 2026-11-25 | `05-model-strategy` (P3) |
| C05 | Qwen3.5 carries a `vision` tag. All sizes accept image input | https://ollama.com/library/qwen3.5 | verified | 2026-10-12 | 2026-11-25 | `05-model-strategy` (P3) |
| C06 | Ollama documents the tool-calling request and response loop | https://github.com/ollama/ollama/blob/main/docs/capabilities/tool-calling.mdx | verified | 2026-10-12 | 2026-11-25 | `05-model-strategy` (P3) |
| C06b | Ollama tool-calling loop, re-fetched for the gateway work in P5 | https://github.com/ollama/ollama/blob/main/docs/capabilities/tool-calling.mdx | verified | 2026-10-12 | 2027-01-02 | `03-agent-runtime` (P5) |
| C07 | Greenhouse Job Board API is public and needs no key | https://docs.greenhouse.io/job-board.html | verified | 2026-10-12 | 2027-03-07 | `13-employer-registry` (P8) |
| C08 | Lever Postings API is public and read-only. `?mode=xml` returns a syndication feed | https://hire.lever.co/developer | verified | 2026-10-12 | 2027-03-07 | `13-employer-registry` (P8) |
| C09 | Ashby public job posting API is documented and supports `listedOnly` | https://developers.ashbyhq.com/docs/public-job-posting-api | verified | 2026-10-12 | 2027-03-07 | `13-employer-registry` (P8) |
| C10 | SmartRecruiters public Posting API is keyless at `api.smartrecruiters.com/v1/companies/{id}/postings`. Availability is tier dependent. There is no list of enabled customers. | https://developers.smartrecruiters.com/docs/posting-api | verified | 2026-10-12 | 2027-03-07 | `13-employer-registry` (P8) |
| C11 | Gmail `users.watch` needs a GCP project, a Pub/Sub topic and an IAM grant, and must be renewed every 7 days | https://developers.google.com/workspace/gmail/api/guides/push | verified | 2026-10-12 | 2027-02-03 | `09-inbox-calendar` (P6) |
| C12 | WhatsApp webhooks carry `X-Hub-Signature-256`, an HMAC-SHA256 of the raw body keyed with the app secret, prefixed `sha256=`. Compare in constant time | https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks | verified | 2026-10-12 | 2027-04-13 | `14-channels` (P9) |
| C13 | Telegram sends `X-Telegram-Bot-Api-Secret-Token` when `secret_token` is set on `setWebhook`. Failed non-2xx deliveries are retried | https://core.telegram.org/bots/api#setWebhook | verified | 2026-10-12 | 2027-04-13 | `14-channels` (P9) |
| C14 | LangGraph pauses on `interrupt()` and resumes with `Command(resume=...)`. A checkpointer and a `thread_id` are required. Side effects before `interrupt()` run again on resume | https://docs.langchain.com/oss/python/langgraph/interrupts | verified | 2026-10-12 | 2027-01-02 | `03-agent-runtime` (P5) |
| C15 | AirLLM streams one layer at a time so a 70B model fits 4 GB VRAM. Cost is seconds per token. It is a Python library, not an OpenAI-compatible server | https://github.com/lyogavin/airllm | evaluated-rejected | 2026-10-12 | 2026-11-25 | `05-model-strategy` (P3) |
| C16 | llama.cpp already exposes layer offload through `--n-gpu-layers`, so the AirLLM idea reaches NOVA without AirLLM | https://github.com/ggml-org/llama.cpp | evaluated-rejected | 2026-10-12 | 2026-11-25 | `05-model-strategy` (P3) |
| C17 | pgvector v0.8.7 supports Postgres 13 and later. Docker tags run pg13 to pg18 | https://github.com/pgvector/pgvector | verified | 2026-10-12 | 2026-10-12 | `02-data-and-audit` (P1) |

## Why AirLLM was rejected

NOVA's planner models fit whole inside 4 GB VRAM. AirLLM buys capacity NOVA does not need and charges latency NOVA cannot pay. The model gateway targets an OpenAI-compatible HTTP endpoint. AirLLM would need an adapter. Keep the rejection under review only if NOVA later targets a model above 17 GB for offline batch work.

## Note on model choice

No ledger row decides which model is the default. The spec says so at spec:510: build a 250-case evaluation set first, then choose. Community reports about small-model tool calling are not evidence. `05-model-strategy` records that rule.

## Open claims

These spec statements need verification at implementation time. They have no official URL in the spec, so they are not ledger rows yet.

| Spec statement | Verify when | Fallback |
|---|---|---|
| Design tokens are recommendations, not claims that the Figma file was edited (spec:417) | Before the P4 tasks start | Measure contrast in the built UI |
| Do not claim a matching false-positive target before an evaluation set exists (spec:715) | Before the P8 tasks start | Report ranking quality as unmeasured |
| Recheck the exact publisher and revision for `Qwen/Qwen3-4B-Instruct-2507` (spec:459) | If the alternative planner is tested | Use the Qwen3.5 family only |
| Plaid or India Account Aggregator for finance import (spec:222) | Before the P7 tasks start | CSV and PDF upload only |
| Meta business verification and WABA setup prerequisites (spec:767) | Before P9 WhatsApp | Ship Telegram only |
