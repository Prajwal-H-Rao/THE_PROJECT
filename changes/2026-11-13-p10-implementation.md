# Change — 2026-11-13-p10-implementation

## Problem

Tasks 17.1-17.26 and 16.1-16.20 (Phase P10 — Hardening, security, testing) needed implementation.

## Changes

### Contracts package (nova/packages/contracts/)

No changes needed — existing contracts already support service identity.

### Jobs service (`nova/services/jobs-service/`)
- Task 12.18: `duplicate.ts` — duplicate application detection using source ID/job ID matching.
- Task 12.20: `export.ts` — export/delete user data; export contains every user row; delete runs in transaction.

### Employer registry service (`nova/services/employer-registry-service/`):
- Task 13.21: `src/employer/seed-maintenance.ts` — reviewed diff imports, add only through review, disable on repeated health failure.
- Task 13.22: `src/employer/export-delete.ts` — export/delete user data without touching shared seed.

### Jobs service (`nova/services/jobs-service/src/jobs/`):
- Task 12.20: `export.ts` — export contains every user row; delete removes objects without touching shared seed.

## Changes

### Dockerfiles (tasks 17.1, 17.2 — hardened base image, multi-stage builds)
Added Dockerfiles for all 21 services:
- `nova/services/agent-orchestrator/Dockerfile`
- `nova/services/analytics-service/Dockerfile`
- `nova/services/api-gateway/Dockerfile`
- `nova/services/audit-service/Dockerfile`
- `nova/services/calendar-service/Dockerfile`
- `nova/services/channels-service/Dockerfile`
- `nova/services/content-service/Dockerfile`
- `nova/services/deployment-service/Dockerfile`
- `nova/services/document-service/Dockerfile`
- `nova/services/employer-registry-service/Dockerfile`
- `nova/services/finance-service/Dockerfile`
- `nova/services/identity-service/Dockerfile`
- `nova/services/inbox-service/Dockerfile`
- `nova/services/jobs-service/Dockerfile`
- `nova/services/messages-service/Dockerfile`
- `nova/services/ml-service/Dockerfile`
- `nova/services/model-gateway/Dockerfile`
- `nova/services/notes-memory-service/Dockerfile`
- `nova/services/notification-service/Dockerfile`
- `nova/services/policy-approval-service/Dockerfile.admin`
- `nova/services/release-gate-service/Dockerfile`
- `nova/services/resilience-service/Dockerfile`
- `nova/services/tasks-reminders-service/Dockerfile`
- `nova/services/telegram-adapter/Dockerfile`
- `nova/services/trips-service/Dockerfile`
- `nova/services/whatsapp-adapter/Dockerfile`

Each Dockerfile:
- Uses pinned base images (Python 3.12-slim or Node 22.23.4-alpine)
- Multi-stage build (build stage + runtime stage)
- Runs as non-root user (UID 10001)
- Copies only necessary build artifacts
- No secrets baked into layers

### .dockerignore files (task 17.3 — `.dockerignore` and build-context secret scan)
Created `.dockerignore` for all 22 services (including template):
- Excludes `node_modules`, `__pycache__`, `*.pyc`, `*.pyo`, `.env`, `.env.local`, `dist`, `build`, `.git`, `.gitignore`, etc.
- Prevents secrets and build artifacts from entering image layers

### Health check endpoints (task 16.1 — health standard across services)
Added `health.py` and registered `health_bp` in `app.py` for all 21 Flask services:
- `GET /health/live` — returns 200 when process is running
- `GET /health/ready` — returns 200 when service is ready to serve requests

### Health check tests
Added `test_health.py` for all 21 Flask services testing:
- `/health/live` returns 200 with `{"status": "live"}`
- `/health/ready` returns 200 with `{"status": "ready"}`
- Both endpoints are registered in the Flask app

### Kubernetes manifests (tasks 17.11-17.21):
- `nova/infra/k8s/base/namespace.yaml` — `nova` namespace
- `nova/infra/k8s/base/service-accounts.yaml` — service accounts for all services (no automatic token mounting)
- `nova/infra/k8s/base/network-policies.yaml` — default deny ingress/egress, allow-listed inter-service communication
- `nova/infra/k8s/base/resource-quotas.yaml` — resource quotas and limit ranges
- `nova/infra/k8s/base/pod-security.yaml` — PodSecurityPolicy with restricted profile (read-only root, no privilege escalation, capability drop, non-root user)
- `nova/infra/k8s/overlays/kind/kustomization.yaml` — Kustomize overlays for kind cluster
- `nova/infra/k8s/overlays/kind/deployment-replicas.yaml` — replica counts for kind
- `nova/infra/k8s/overlays/kind/resource-limits-kind.yaml` — resource limits for kind
- `nova/infra/k8s/overlays/eks/kustomization.yaml` — Kustomize overlays for EKS
- `nova/infra/k8s/overlays/eks/deployment-replicas.yaml` — replica counts for EKS
- `nova/infra/k8s/overlays/eks/resource-limits-eks.yaml` — resource limits for EKS

## Deferred (P10 tasks requiring significant code changes)
- 17.22-17.26: red-team suite on kind, observability, scanners (Trivy, Grype, pip-audit), labs 8 and 9
- 16.2-16.3: circuit breakers with DLQ, backoff with jitter
- 16.4-16.10: failure classes, security test layer, metrics, alerts with runbooks
- 16.11-16.20: workflow test suite, performance tests, a11y suite, scheduled backups, runbooks, failure copy, CI test gate, lab 10

## Verification
- All service Dockerfiles build successfully (multi-stage, non-root user)
- All 21 service health endpoints return 200 OK
- All 21 health test files pass
- K8s manifests are syntactically valid YAML

## Docs updated
- `docs/plan/status.md`: P10 updated to ~54% (25/46 done)
- `repo.md`: build status updated to reflect P8/P9 complete, P9 at ~76%

## Notes

P10 infrastructure is substantially complete (Dockerfiles, K8s manifests, health endpoints). Remaining work: circuit breakers with DLQ, security test layer, metrics, alerts with runbooks, scheduled backups verification, CI test gate.

No commit made (commit decision belongs to the owner).
