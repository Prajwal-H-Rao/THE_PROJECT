# Observability

## Chosen (spec:439)

**OpenTelemetry + structured JSON logs; Prometheus/Grafana or CloudWatch**

## Rationale

- Correlation IDs across API, queue, Python workers, and tool providers.
- Redact payloads and secrets in logs and traces.
- OpenTelemetry is vendor-neutral; Prometheus/Grafana for self-hosted, CloudWatch for AWS.

## Rejected

| Option | Reason |
|--------|--------|
| Proprietary APM | Vendor lock-in, higher cost, less control over data. OpenTelemetry + Prometheus/Grafana provides equivalent observability with open standards. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row.