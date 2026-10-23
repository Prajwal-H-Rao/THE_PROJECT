# Database

## Chosen (spec:427)

**PostgreSQL with Prisma**

## Rationale

- ACID transactions and relational queries suit structured data (tasks, events, finances, trips).
- Prisma provides type-safe ORM with excellent TypeScript integration.
- PostgreSQL is robust for AWS RDS and self-hosted deployments.
- Per-service schemas/roles enforce isolation (spec:20).

## Rejected

| Option | Reason |
|--------|--------|
| MySQL | Similar capabilities but PostgreSQL has better JSONB support, partial indexes, and richer extension ecosystem (pgvector, etc.). |
| SQLite beyond local dev | SQLite lacks concurrent write support, network access, and production-grade tooling. Acceptable only for quick local development. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row.