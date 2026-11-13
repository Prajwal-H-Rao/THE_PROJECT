-- Migration 42: application envelope and idempotency columns
-- Branch: 42
-- Extends application_draft with envelope fields per spec:528 (payload hash,
-- nonce, tool version, expiry) and application_submission with confirmation
-- fields and idempotency key per tasks 12.12-12.15.
-- Does NOT CREATE application_draft or application_submission (migration 09
-- already created them).

ALTER TABLE jobs_service.application_draft
    ADD COLUMN IF NOT EXISTS payload_hash  TEXT,
    ADD COLUMN IF NOT EXISTS nonce         TEXT,
    ADD COLUMN IF NOT EXISTS tool_version  TEXT,
    ADD COLUMN IF NOT EXISTS expires_at    TIMESTAMPTZ;

ALTER TABLE jobs_service.application_submission
    ADD COLUMN IF NOT EXISTS provider_reference TEXT,
    ADD COLUMN IF NOT EXISTS response_evidence TEXT,
    ADD COLUMN IF NOT EXISTS idempotency_key  TEXT UNIQUE;
