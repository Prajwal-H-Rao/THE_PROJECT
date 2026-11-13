# Service Recovery Runbook

This runbook covers recovery procedures for common service failures in the NOVA platform.

## Service Down

### Symptom
Service health check returns 503 or connection refused.

### Diagnosis
1. Check if the service pod is running:
   ```bash
   kubectl get pods -n nova | grep <service-name>
   ```
2. Check pod logs:
   ```bash
   kubectl logs -n nova <pod-name>
   ```
3. Check if the port is listening:
   ```bash
   kubectl exec -n nova <pod-name> -- ss -tlnp
   ```

### Recovery
1. Restart the pod:
   ```bash
   kubectl rollout restart deployment/<service-name> -n nova
   ```
2. Wait for the pod to become ready:
   ```bash
   kubectl wait --for=condition=ready pod -l app=<service-name> -n nova --timeout=60s
   ```
3. Verify health endpoint:
   ```bash
   curl -f http://<service-ip>:8000/health/live
   ```

## Circuit Breaker Open

### Symptom
Service returns "circuit breaker open" errors.

### Diagnosis
1. Check the circuit breaker state:
   ```bash
   curl http://<service-ip>:8000/health/ready
   ```
2. Check recent error logs:
   ```bash
   kubectl logs -n nova <pod-name> --tail=50
   ```

### Recovery
1. Wait for the recovery timeout (default 30 seconds).
2. The circuit breaker will transition to half-open state.
3. Send a test request to verify recovery.
4. If the test succeeds, the circuit breaker will close automatically.

## Database Connection Failure

### Symptom
Service cannot connect to PostgreSQL.

### Diagnosis
1. Check PostgreSQL pod status:
   ```bash
   kubectl get pods -n nova -l app=postgres
   ```
2. Check PostgreSQL logs:
   ```bash
   kubectl logs -n nova postgres-<pod-name>
   ```
3. Verify network connectivity:
   ```bash
   kubectl exec -n nova <pod-name> -- pg_isready -h postgres -U nova -d nova
   ```

### Recovery
1. Restart PostgreSQL pod:
   ```bash
   kubectl rollout restart deployment/postgres -n nova
   ```
2. Wait for PostgreSQL to be ready:
   ```bash
   kubectl wait --for=condition=ready pod -l app=postgres -n nova --timeout=120s
   ```

## Queue Depth High

### Symptom
Queue depth exceeds 1000 messages.

### Diagnosis
1. Check consumer status:
   ```bash
   kubectl get pods -n nova -l app=worker
   ```
2. Check queue depth:
   ```bash
   kubectl exec -n nova <redis-pod> -- redis-cli LLEN <queue-name>
   ```

### Recovery
1. Scale up worker replicas:
   ```bash
   kubectl scale deployment <worker-deployment> -n nova --replicas=5
   ```
2. Monitor queue depth until it decreases.

## Circuit Breaker Recovery

### Symptom
Circuit breaker is open, blocking all requests.

### Diagnosis
1. Check circuit breaker state via metrics:
   ```bash
   curl http://<service-ip>:8000/metrics | grep circuit_breaker
   ```
2. Check recent errors:
   ```bash
   kubectl logs -n nova <pod-name> --tail=50 | grep -i error
   ```

### Recovery
1. Wait for recovery timeout (default 30 seconds).
2. The circuit breaker will enter half-open state.
3. Send a test request to verify recovery.
4. If successful, circuit breaker closes automatically.