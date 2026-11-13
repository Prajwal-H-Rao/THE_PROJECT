-- Migration 41: registry extensions for spec:564/spec:565 and task 17 run record
-- Branch: 41
-- Extends employer_targets with the five spec:564 fields the SQL omits
-- (alternate names, remote preference, experience band, compensation preference,
-- visa needs). Extends employer_job_sources with source-record fields per spec:565.
-- Extends job_source_run with task-17 run-record fields (closed openings, dedupe
-- count, HTTP status class, error class, correlation ID).
-- Does NOT CREATE employer_targets, employer_job_sources, job_opening,
-- job_source_run, or job_match (migrations 10 and 40 already created them).

ALTER TABLE employer_registry_service.employer_targets
    ADD COLUMN IF NOT EXISTS alternate_names      TEXT[],
    ADD COLUMN IF NOT EXISTS remote_preference    TEXT,
    ADD COLUMN IF NOT EXISTS experience_band      TEXT,
    ADD COLUMN IF NOT EXISTS compensation_preference TEXT,
    ADD COLUMN IF NOT EXISTS visa_needs           TEXT;

ALTER TABLE employer_registry_service.employer_job_sources
    ADD COLUMN IF NOT EXISTS access_method        TEXT,
    ADD COLUMN IF NOT EXISTS evidence_url         TEXT,
    ADD COLUMN IF NOT EXISTS robots_reviewed_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS terms_reviewed_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS allowed_hostnames    TEXT[],
    ADD COLUMN IF NOT EXISTS listed_only          BOOLEAN,
    ADD COLUMN IF NOT EXISTS request_interval     TEXT,
    ADD COLUMN IF NOT EXISTS etag                 TEXT,
    ADD COLUMN IF NOT EXISTS last_modified        TEXT,
    ADD COLUMN IF NOT EXISTS last_poll_at         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_success_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status_code          INTEGER,
    ADD COLUMN IF NOT EXISTS parse_version        TEXT,
    ADD COLUMN IF NOT EXISTS circuit_breaker_state TEXT;

ALTER TABLE employer_registry_service.job_source_run
    ADD COLUMN IF NOT EXISTS closed_openings   INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dedupe_count      INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS http_status_class TEXT,
    ADD COLUMN IF NOT EXISTS error_class       TEXT,
    ADD COLUMN IF NOT EXISTS correlation_id    UUID;
