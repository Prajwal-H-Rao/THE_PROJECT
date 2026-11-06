# Phase P10 implementation approach

Repo: /home/prajwal/THE_PROJECT (git repo; never commit). Nothing here is committed until you approve.

## Approach

Complete P10 (Hardening, security and testing) after P9 sign-off. P10 has 46 tasks across two module files. Each task names an artifact and a test. A task counts as complete only when its test passes.

P10 covers container controls, Kubernetes controls, repo layout, Docker packaging rules, reliability, failure handling, recovery, testing, observability, audit contract.

## Files to touch (P10)

- `docs/plan/17-deployment-hardening.md` — tasks across container/K8s controls and repo layout
- `docs/plan/16-reliability-testing.md` — task 9 (metrics: latency histogram, queue depth, error rate, retries, breaker state, worker RSS, tokens, cost, approval wait)

## P10 dependencies

P10 assumes P9 is complete. Gate criteria: no known direct model-to-tool path remains; success and failure states tie to authoritative evidence; model and parser workloads cannot reach DB, secrets, Docker socket, host paths, or arbitrary egress.

## Verification steps before code

1. Run `python nova/tests/layout/check_layout.py` — must exit 0.
2. Run `python nova/tests/layout/test_layout_checks.py` — must exit 0.
3. Confirm P9 tasks are done before starting P10 tasks.

## Negator readiness

This approach touches plan docs only. No service code changes yet. When the negator limit clears, send this document to two `general` subagents in parallel. Proceed only when both return SOUND.

## After negator sign-off

Implement tasks in order. Run the layout checker after each path change under `nova/`. Update `repo.md` and add a `changes/` entry per task. Do not commit — you commit when you choose.
