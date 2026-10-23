-- Migration 10: employer registry schema
-- Branch: 10
-- Creates employer_targets, employer_job_sources, job_opening, job_source_run
-- in the employer_registry_service schema. Matches spec SQL at line 590.

CREATE TABLE employer_registry_service.employer_targets (
    employer_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    domain            TEXT,
    industry          TEXT,
    size_band         TEXT, -- '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
    region            TEXT, -- 'IN', 'GLOBAL', etc.
    status            TEXT NOT NULL DEFAULT 'unverified', -- 'unverified', 'verified', 'blocked', 'archived'
    verified_at       TIMESTAMPTZ,
    verification_ref  TEXT, -- pointer to verification evidence
    metadata          JSONB NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION employer_registry_service;

CREATE INDEX idx_employer_targets_name ON employer_registry_service.employer_targets (name);
CREATE INDEX idx_employer_targets_domain ON employer_registry_service.employer_targets (domain);
CREATE INDEX idx_employer_targets_status ON employer_registry_service.employer_targets (status);
CREATE INDEX idx_employer_targets_region ON employer_registry_service.employer_targets (region);

CREATE TABLE employer_registry_service.employer_job_sources (
    source_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id       UUID NOT NULL REFERENCES employer_registry_service.employer_targets (employer_id) ON DELETE CASCADE,
    name              TEXT NOT NULL, -- 'careers_page', 'linkedin', 'indeed', 'greenhouse', 'lever', 'workday', 'custom'
    base_url          TEXT NOT NULL,
    selector_config   JSONB NOT NULL DEFAULT '{}', -- CSS/XPath selectors for parsing
    auth_config       JSONB, -- optional auth for private sources
    schedule_cron     TEXT, -- e.g., '0 2 * * *' for daily at 2am
    is_active         BOOLEAN NOT NULL DEFAULT true,
    last_run_at       TIMESTAMPTZ,
    last_run_status   TEXT, -- 'success', 'partial', 'failed'
    metadata          JSONB NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION employer_registry_service;

CREATE INDEX idx_employer_job_sources_employer ON employer_registry_service.employer_job_sources (employer_id);
CREATE INDEX idx_employer_job_sources_active ON employer_registry_service.employer_job_sources (is_active);

CREATE TABLE employer_registry_service.job_opening (
    opening_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id       UUID NOT NULL REFERENCES employer_registry_service.employer_targets (employer_id) ON DELETE CASCADE,
    source_id         UUID REFERENCES employer_registry_service.employer_job_sources (source_id) ON DELETE SET NULL,
    title             TEXT NOT NULL,
    department        TEXT,
    location          TEXT,
    remote_type       TEXT, -- 'remote', 'hybrid', 'onsite'
    description       TEXT,
    requirements      TEXT,
    salary_min        NUMERIC(19, 4),
    salary_max        NUMERIC(19, 4),
    currency          TEXT NOT NULL DEFAULT 'USD',
    employment_type   TEXT, -- 'full_time', 'part_time', 'contract', 'internship'
    posted_at         TIMESTAMPTZ,
    expires_at        TIMESTAMPTZ,
    status            TEXT NOT NULL DEFAULT 'open', -- 'open', 'filled', 'closed', 'expired'
    source_url        TEXT,
    fingerprint       CHAR(64) NOT NULL, -- SHA-256 for deduplication
    raw_ref           TEXT, -- pointer to object store for raw opening
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (fingerprint)
) AUTHORIZATION employer_registry_service;

CREATE INDEX idx_job_opening_employer ON employer_registry_service.job_opening (employer_id);
CREATE INDEX idx_job_opening_source ON employer_registry_service.job_opening (source_id);
CREATE INDEX idx_job_opening_posted ON employer_registry_service.job_opening (posted_at);
CREATE INDEX idx_job_opening_status ON employer_registry_service.job_opening (status);

CREATE TABLE employer_registry_service.job_source_run (
    run_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id         UUID NOT NULL REFERENCES employer_registry_service.employer_job_sources (source_id) ON DELETE CASCADE,
    started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at      TIMESTAMPTZ,
    status            TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'partial', 'failed'
    openings_found    INTEGER NOT NULL DEFAULT 0,
    openings_new      INTEGER NOT NULL DEFAULT 0,
    openings_updated  INTEGER NOT NULL DEFAULT 0,
    error_message     TEXT,
    metadata          JSONB NOT NULL DEFAULT '{}'
) AUTHORIZATION employer_registry_service;

CREATE INDEX idx_job_source_run_source ON employer_registry_service.job_source_run (source_id);
CREATE INDEX idx_job_source_run_started ON employer_registry_service.job_source_run (started_at);