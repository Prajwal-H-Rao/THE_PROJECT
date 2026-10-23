-- The outbox and the consumer receipts of the local queue flow. The jobs_service schema
-- owns both tables, so no cross-service write privilege exists (module 01 rule, spec:20).
-- The producer inserts events into the outbox. The consumer records each event id once in
-- the receipts table. A second delivery is a no-op, so consumers stay idempotent.

CREATE TABLE jobs_service.queue_outbox (
    event_id          TEXT PRIMARY KEY,
    event_type        TEXT NOT NULL,
    schema_version    INTEGER NOT NULL,
    occurred_at       TIMESTAMPTZ NOT NULL,
    producer          TEXT NOT NULL,
    correlation_id    TEXT NOT NULL,
    causation_id      TEXT NOT NULL,
    subject_id        TEXT NOT NULL,
    user_id           TEXT NOT NULL,
    payload           JSONB NOT NULL
) AUTHORIZATION jobs_service;

CREATE TABLE jobs_service.event_receipts (
    event_id       TEXT PRIMARY KEY,
    event_type     TEXT NOT NULL,
    recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION jobs_service;
