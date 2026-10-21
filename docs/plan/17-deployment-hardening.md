# Module 17 — Deployment, container and Kubernetes hardening

Phase P10. Spec headings: container controls, Kubernetes controls, repo layout, Docker packaging rules.

## Goal

Docker Compose is the MVP runtime. Kubernetes is the local target. Model and parser workloads run under a restricted profile. They hold no database route. They hold no secrets. They mount no host path. The runtime limits their egress.

## Constraints (spec, binding)

- Spec:23: "Docker is the mandatory service packaging layer. Kubernetes is a first-class orchestration technology: use kind/k3d for local cluster practice and policy validation; deploy to AWS EKS only if cloud budget and operational readiness permit."
- Spec:814: the parser sandbox runs "as non-root, no shell subprocess where avoidable, no DB credentials, no cloud credentials, no writable host mounts, minimal read-only root filesystem plus bounded ephemeral temp space... and no unrestricted egress."
- Spec:499: "never mount `/var/run/docker.sock` into the model container."
- Spec:833: "set non-root `USER`, drop Linux capabilities, enable default or narrower seccomp... set `read_only: true` when compatible, create bounded `tmpfs`, set memory/CPU/PID limits, use no privileged mode, mount no Docker socket, disable host network."
- Spec:842: Restricted Pod Security sets "`runAsNonRoot: true`, a fixed non-zero UID, `allowPrivilegeEscalation: false`, `capabilities.drop: [\"ALL\"]`, `seccompProfile.type: RuntimeDefault`."
- Spec:845: "The parser and model workers should have no route to Postgres, Redis administration, object-storage control planes, the internet or arbitrary peers."
- Spec:851 sets the Kubernetes acceptance gate. It needs manifest validation plus a cluster test. The cluster test covers:
  - Default-deny networking
  - Least-privilege service accounts
  - Restricted Pod Security
  - Bounded resources
  - No privileged pods
  - Expected allow and deny traffic

## Build sequence

| # | Task | Artifact | Test |
|---|---|---|---|
| 1 | Write the hardened base image: non-root UID, read-only root, pinned digest | `infra/images/base/` | `USER` is non-zero |
| 2 | Convert every Dockerfile to multi-stage with pinned digests and no build args holding secrets | each `Dockerfile` | Image scan passes |
| 3 | Add `.dockerignore` and a secret scan on the build context | CI | No secret in any layer |
| 4 | Write the default-deny Compose network with per-service exceptions | `infra/compose/` | Parser cannot reach Postgres |
| 5 | Add the ML and document profile: no DB route, no secrets, egress to an allow-list, resource limits | Compose profile | Profile test passes |
| 6 | Run the model service on loopback and the private network only | Compose config | Public scan fails |
| 7 | Enforce read-only root filesystems and tmpfs scratch on ML and parser containers | Compose | Write outside tmpfs fails |
| 8 | Add resource limits: CPU, memory, PID count, file descriptors | Compose | A runaway process is killed |
| 9 | Wire the egress proxy with an allow-list for model, parser, connector and browser worker workloads | `infra/egress/` | Blocked host fails |
| 10 | Prove no Docker socket or host path is mounted | Compose test | Mount check passes |
| 11 | Build the Kubernetes manifests: Namespaces, NetworkPolicy, ResourceQuota, LimitRange | `infra/k8s/base/` | Manifest validation passes |
| 12 | Apply Pod Security Admission with `restricted` and the documented exceptions | `infra/k8s/` | A privileged pod is rejected |
| 13 | Add Kustomize overlays for `kind` and for the optional EKS target, over the base manifests | `infra/k8s/overlays/` | The kind overlay applies cleanly and differs from base only in overlay fields (spec:679, spec:713) |
| 14 | Build the local `kind` cluster target with pinned node image | `infra/k8s/overlays/kind/` | `make kind-up` works from a clean checkout |
| 15 | Add seccomp, capability dropping and `allowPrivilegeEscalation: false` | manifests | Scan passes |
| 16 | Use external `SecretRef` files with least privilege and documented rotation | manifests | No secret in an env var |
| 17 | Add non-root FSGroup, dedicated ServiceAccounts and token automount control | manifests | Default SA cannot read secrets |
| 18 | Run a private registry with per-environment pull credentials and image signing | `infra/registry/` | Unsigned image is rejected |
| 19 | Add multi-arch builds for amd64 and arm64 | CI | Both images build |
| 20 | Add namespace isolation, bounded resources, service accounts and default-deny network policy to the kind cluster, per spec:837-849 | manifests | Every namespace enforces Restricted Pod Security and default-deny egress |
| 21 | Add rolling deploys, preStop hooks and a version endpoint per service | manifests + services | Zero-downtime roll passes |
| 22 | Re-run the P5 scope-lock red-team suite against the deployed kind services. Prove no code path or Kubernetes permission changes a workload spec. | `labs/lab09-proofs/` | The suite passes against the cluster, and a workload-spec edit attempt is denied (spec:713, spec:851) |
| 23 | Set up Prometheus scrape annotations, OpenTelemetry sidecars and dashboards | `infra/observability/` | Metrics scrape succeeds |
| 24 | Run Trivy, Grype and pip-audit in CI; fail on critical CVEs | CI config | A planted CVE fails the build |
| 25 | Deliver curriculum lab 8: hardened Dockerfile passing the isolation checks | `labs/lab08/` | Non-root and no-egress tests pass |
| 26 | Deliver curriculum lab 9: kind cluster with three namespaces and default-deny | `labs/lab09/` | A cross-namespace call fails |

## Acceptance tests

- `test_parser_has_no_db_route` — the parser container fails to connect to Postgres.
- `test_parser_has_no_secrets` — the container env and mounts contain no credential.
- `test_no_docker_socket_mounted` — no container can see `/var/run/docker.sock`.
- `test_no_host_path_mounted` — only declared volumes exist.
- `test_egress_allowlist_holds` — a request to a non-allow-listed host fails.
- `test_privileged_pod_rejected` — Pod Security Admission blocks it.
- `test_readonly_root_holds` — a write outside tmpfs fails.
- `test_unsigned_image_rejected` — the registry refuses it.
- `test_cve_fails_ci` — a planted critical CVE stops the build.

## Build order

Work these steps in order. A step names tasks from the table above.

1. Harden the base image and convert every Dockerfile to multi-stage.
2. Write the default-deny Compose network and the ML profile.
3. Prove the parser has no database route and no secrets.

## Risks

- Kubernetes is a large surface for a solo build. Ship Compose as the supported MVP path and treat `kind` as the target, not a blocker for P10.
- Egress proxying adds latency and a failure mode. Make the deny path fail closed, and log the reason code.
- Image signing needs a key management story. Start with a local key and document rotation in the runbook.
