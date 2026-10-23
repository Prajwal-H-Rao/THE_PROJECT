# Python Workers

## Chosen (spec:436)

**RQ on Redis**

## Rationale

- RQ is simpler for a small self-hosted system (single developer, limited ops capacity).
- Redis is already in the stack for BullMQ and caching.
- Use durable idempotency/locks, task timeouts, and dead-letter handling.
- Keep workers separate from Flask web workers.

## Rejected

| Option | Reason |
|--------|--------|
| Celery + Redis/RabbitMQ | Suited for more complex routing/retries/throughput. Overkill for NOVA's current scale. Adds configuration and monitoring complexity. |
| Ad-hoc threads | No durability, no retry logic, no visibility. Threads die with the process. Unacceptable for consequential background work. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row.