# Module 16 — Reliability, testing and observability

Phase P10. Spec headings: Reliability, Failure Handling and Recovery, Testing, Observability and Audit Contract, Required test layers, Observability.

## Goal

Every service has health checks, bounded retries, a dead-letter path and a recovery drill. Every layer of the test pyramid exists and runs in CI. Every consequential action is traceable.

## Constraints (spec, binding)

- Spec:719: "Each service exposes `/health/live` and `/health/ready` without leaking secrets."
- Spec:853: classify failures as "validation/permanent (do not retry), unauthorized/forbidden (stop and audit), rate limited (respect `Retry-After` and bounded backoff), transient network/server error (bounded exponential backoff plus jitter), uncertain external side effect (reconcile first), and duplicate event (acknowledge without repeating action)."
- Spec:855: "Introduce a circuit breaker for repeatedly failing integrations, and make degraded behavior explicit... Do not silently show stale data as current."
- Spec:856: "Export and deletion workflows must propagate to vectors, object files, queued tasks, channel mappings and caches."
- Spec:857: "Human-facing failure language should identify the last confirmed stage."
- Spec:907: "redact high-cardinality PII from labels."
- Spec:868: fault injection must "Verify no false success or duplicate side effect."

## Test layers

| Layer | Scope | Tooling |
|---|---|---|
| Unit | Pure logic, validation, parsers, policy, arithmetic | Vitest, Pytest |
| Schema and contract | Pydantic, Zod, OpenAPI, event compatibility | Contract tests |
| Integration | DB, object storage, queues, provider mocks | Testcontainers |
| Workflow | Pause, resume, approval, timeout, repair, cancellation, stale job | Fake model |
| End-to-end | User and administrator journeys with a mock provider | Playwright |
| Red-team | Injection, cross-user, tool abuse, bypass attempts | `tests/red-team/` |
| Performance | API latency, queue depth, worker memory, concurrency | k6 |
| Accessibility | Keyboard, focus, labels, ARIA, contrast, reduced motion | Playwright plus axe |
| Backup and restore | Failover, restore, integrity verification | Drill script |
| Security | Auth boundaries, SSRF, CSRF, XSS, injection, path traversal, authz, object authorization, secret redaction, webhook forgery and replay, dependency and image scanning (spec:866) | ZAP, Trivy, audit |

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Standardise `/health/live` and `/health/ready` across services | each service | Readiness fails when deps are down | 5 |
| 2 | Add circuit breakers on provider calls | integration service | Breaker opens and half-opens | 6 |
| 3 | Implement exponential backoff with jitter and a DLQ per queue | worker | DLQ receives a poisoned job | 6 |
| 4 | Classify failures: failed, unverified, delayed | orchestrator | Each class renders differently | 5 |
| 5 | Build fault injection: timeouts, 429, 5xx, malformed body, partial write, stale job, restart | `tests/faults/` | Each path is covered | 8 |
| 6 | Add structured logging with correlation IDs and a redaction allow-list | all services | Log scan finds no secret | 6 |
| 7 | Finish the OpenTelemetry trace: gateway to DB to provider | observability | One trace spans the path | 6 |
| 8 | Build metrics: latency histogram, queue depth, error rate, retries, breaker state, worker RSS, tokens, cost, approval wait | observability | Dashboards render | 7 |
| 9 | Add alerts with runbooks: sustained error rate, queue depth, provider auth failure, disk, cert expiry, restore failure, cost | `infra/alerts/` | Each alert links a runbook | 6 |
| 10 | Expand the workflow test suite: pause, resume, approval, timeout, repair, cancel, stale | tests | All paths covered | 7 |
| 11 | Add performance tests with realistic data volumes | `tests/perf/` | p95 recorded, no target claimed early | 6 |
| 12 | Run the accessibility suite in CI | `tests/a11y/` | Critical issues fail CI | 5 |
| 13 | Schedule automated backups with integrity verification | `infra/` | Verification runs per backup | 5 |
| 14 | Run a restore drill into an empty environment | drill report | Restore passes the schema check | 6 |
| 15 | Write recovery runbooks: provider outage, model down, DB restore, key rotation, queue drain, rollback, incident, GDPR export or delete | `docs/runbooks/` | Every runbook row carries one command and the output of one recorded run | 9 |
| 16 | Render failure copy that names the last confirmed stage, a reason and a next safe step | web UI error states | An injected fault renders the stage, not a generic error | 4 |
| 17 | Write the spec:845 runbooks (cluster access, audit logs, upgrade and patch, quota and cost alerts) and run the compromised parser pod drill | `docs/runbooks/` plus drill record | The record shows the parser pod reaching no DB and no internet | 6 |
| 18 | Build a CI job that fails on a missing required test or an unverified optional claim | CI config | Missing test fails the build | 5 |
| 19 | Deliver curriculum lab 10: tracing, metrics and one restore drill | `labs/lab10/` | The trace renders and the restore passes | 5 |
This build sequence sums to 113 hours.

## Acceptance tests

- `test_readiness_fails_when_db_down` — readiness returns 503 while liveness stays 200.
- `test_retry_uses_backoff_and_jitter` — timings match the schedule.
- `test_dlq_receives_poisoned_job` — a job that always fails lands in the DLQ.
- `test_no_non_idempotent_auto_retry` — a send without an idempotency key is not retried.
- `test_partial_write_failure_leaves_no_partial_state` — the transaction rolls back.
- `test_trace_spans_ui_to_db` — one trace covers the full path.
- `test_no_secret_in_metrics_or_traces` — label and span scan is clean.
- `test_restore_drill_passes` — a clean restore and schema check.

## Build order

Work these steps in order. A step names tasks from the table above. At 30 hours per week a phase spans several weeks, so a step may run into the next week.

1. Standardise health checks and add circuit breakers plus the DLQ.
2. Build fault injection and cover every failure path.
3. Finish traces, metrics, alerts and one restore drill.

## Risks

- Do not claim a performance target before the evaluation exists. Record the measured p95 first, then agree a target.
- Alert fatigue is real in a solo setup. Alert only on conditions with a runbook.
- The restore drill is the test most often skipped. Schedule it inside P10, not after release.
