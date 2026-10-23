# Container Packaging

## Chosen (spec:440)

**Docker / OCI images + Docker Compose**

## Rationale

- Required for every deployable service and isolated worker.
- Multi-stage builds, pinned base images, non-root runtime users.
- Image scanning, SBOM/provenance where practical.
- Resource limits and no secrets baked into images.
- Compose gives a fast local microservices environment.

## Rejected

| Option | Reason |
|--------|--------|
| Language-specific bundlers | Produce platform-specific artifacts, no isolation, no standard runtime interface. Docker/OCI is the universal deployment unit. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row.