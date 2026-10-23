# Queue

## Chosen (spec:428)

**BullMQ on Redis**

## Rationale

- BullMQ (Redis-based) integrates easily with Node.js/TypeScript services.
- Provides job scheduling, retries, priorities, and rate limiting out of the box.
- Redis is already used for caching and session storage.
- Avoids adding RabbitMQ as a separate infrastructure component.

## Rejected

| Option | Reason |
|--------|--------|
| RabbitMQ | Powerful but adds complexity: separate broker, protocol (AMQP), and operational overhead. BullMQ on Redis satisfies NOVA's job scheduling needs (email sync, agent steps) with fewer moving parts. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row.