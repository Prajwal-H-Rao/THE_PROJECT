# 2026-10-25 — Module 08 task 15 — approval wait and expiry metrics

## Scope

Implement approval wait and expiry metrics for observability (Module 08 task 15, plan `docs/plan/08-policy-approval.md` task 15). Acceptance: "Metric renders".

## Implementation

### Metrics module (`approval-metrics.ts`)

- `ApprovalMetrics` class with in-memory counters and histograms
- Records: grant created, consumed, approved, rejected, expired, revoked
- Wait time histogram with standard Prometheus buckets (100ms to 1hr+)
- Expiry events stored with nonce, userId, service, action, wait time
- Error counter by error code
- Percentile computation (p50, p95, p99) from histogram buckets
- Prometheus text format export

### Metrics recorded by grants service (`grants.service.ts`)

- `createGrant` / `createGrantWithDetails` → `recordCreated`
- `consumeGrant` → `recordConsumed` (wait = consumedAt - createdAt)
- `approveGrant` → `recordApproved` (wait = decidedAt - createdAt)
- `rejectGrant` → `recordRejected`
- `expireGrant` → `recordExpired` (stores expiry event with wait time)
- `revokeGrant` → `recordRevoked`
- Errors in controller → `recordError`

### Controller endpoints (`grants.controller.ts`)

- `GET /policy/grants/metrics?format=json|prometheus` — all metrics
- `GET /policy/grants/metrics/wait-stats?service=X&action=Y` — percentile stats for a service:action

### Tests (13 new tests, 116 total)

- Counter incrementing for all grant lifecycle events
- Wait time histogram bucket accumulation
- Expiry event storage and limit (1000)
- Prometheus format output
- Percentile computation (p50, p95, p99)
- Reset and edge cases

## Verification

- Policy service `npm test`: 116 pass (13 new metrics tests)
- Contracts `npm test`: 75 pass
- Layout: 107/74/37 passed
- All files under 200 lines, header comments, ASD-STE100 language

## Notes

- In-memory implementation; SQL adapter swaps in later
- Prometheus format compatible with standard scrapers
- Wait time measured from grant creation to consumption/approval/decision
- Expiry events include full context for alerting/analysis