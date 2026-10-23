# Orchestration

## Chosen (spec:441)

**Kubernetes (kind/k3d locally; AWS EKS optional)**

## Rationale

- First-class stack component for deploying, scaling, health-checking, and applying network/workload policies to independent services.
- Use namespaces, Deployments, Jobs/CronJobs, Services, probes, Secrets integration, service accounts, RBAC, NetworkPolicies, and Restricted Pod Security Standards.
- Start with kind/k3d for local development.
- Cloud EKS is gated by budget and hardening readiness.

## Rejected

| Option | Reason |
|--------|--------|
| Compose only | Compose lacks production-grade orchestration: no rolling updates with health checks, no cluster-wide networking policies, no RBAC, no horizontal pod autoscaling, no self-healing. Kubernetes is required for the target deployment model. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row. Kubernetes versions and EKS pricing change regularly.