# Monitoring

## Chosen (spec:431)

**Prometheus and Grafana**

## Rationale

- Self-hosted metrics collection and visualization.
- Integrates with OpenTelemetry and the Prometheus exporter ecosystem.
- Grafana dashboards for service health, queue depth, latency, error rates.
- Alertmanager for alerting.

## Rejected

| Option | Reason |
|--------|--------|
| AWS CloudWatch-only | Vendor lock-in; CloudWatch metrics are coarse-grained and expensive at scale. Prometheus + Grafana provides finer granularity and no per-metric cost. CloudWatch remains an option for log aggregation if deployed on AWS. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row.