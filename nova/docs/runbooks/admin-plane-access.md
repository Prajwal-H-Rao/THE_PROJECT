# Admin Plane Access Runbook (Layer 10)

## Overview

The NOVA admin plane is isolated on the `nova-admin` Docker network. Admin endpoints are **not accessible from the public internet** (chat). Access requires network-level access to the `nova-admin` Docker network.

## Admin Endpoints

| Endpoint | Service | Port | Network |
|----------|---------|------|---------|
| `GET /policy-admin/rules` | policy-admin-service | 8001 | nova-admin |
| `GET /policy-admin/rules/:id` | policy-admin-service | 8001 | nova-admin |
| `GET /policy-admin/families` | policy-admin-service | 8001 | nova-admin |
| `GET /policy-admin/validate` | policy-admin-service | 8001 | nova-admin |
| `GET /policy-admin/version` | policy-admin-service | 8001 | nova-admin |

## Access Methods

### 1. Docker Network Access (Development)
```bash
# Run a temporary container on the nova-admin network
docker run --rm --network nova_nova-admin \
  curlimages/curl:8.8.0 \
  curl -H "Authorization: Bearer <admin-token>" \
  http://policy-admin-service:8001/policy-admin/version
```

### 2. Kubernetes (Production)
```bash
# Port-forward to the policy-admin-service pod
kubectl port-forward -n nova svc/policy-admin-service 8001:8001

# Then access locally
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:8001/policy-admin/version
```

### 3. Docker Compose (Local Development)
```bash
# Run admin probe on nova-admin network
docker compose -f nova/infra/compose/compose.yaml -f nova/infra/compose/compose.platform.yaml \
  --profile admin run --rm probe-admin-allow
```

## Network Verification

### Verify Admin Isolation
```bash
# Should succeed (from nova-admin network)
docker compose -f nova/infra/compose/compose.yaml -f nova/infra/compose/compose.platform.yaml \
  --profile admin run --rm probe-admin-allow

# Should fail (from nova-app network)
docker compose -f nova/infra/compose/compose.yaml -f nova/infra/compose/compose.platform.yaml \
  --profile guard run --rm probe-admin-deny
```

### Expected Results
- **probe-admin-allow**: `outcome=connected` (from nova-admin network)
- **probe-admin-deny**: `outcome=blocked` (from nova-app network)

## CI Verification

The CI pipeline includes admin network isolation tests:
```bash
# Runs in CI as part of the guard profile
docker compose -f nova/infra/compose/compose.yaml -f nova/infra/compose/compose.platform.yaml \
  --profile guard run --rm probe-admin-allow
docker compose -f nova/infra/compose/compose.yaml -f nova/infra/compose/compose.platform.yaml \
  --profile guard run --rm probe-admin-deny
```

## Security Notes

1. **Admin endpoints are NOT exposed via Caddy edge** - Caddy returns 404 for `/policy-admin/*` paths
2. **Admin endpoints require `policy:admin` scope** - Service JWT with admin scope required
3. **Network isolation enforced by Docker** - `nova-admin` is an internal bridge network
4. **No direct internet access** - `nova-admin` network has `internal: true`

## Emergency Access

If the admin network is unreachable:
1. Check Docker network: `docker network ls | grep nova-admin`
2. Check policy-admin-service health: `docker ps | grep policy-admin`
3. Check logs: `docker logs <policy-admin-container>`
4. Verify network connectivity: `docker run --rm --network nova_nova-admin alpine ping policy-admin-service`