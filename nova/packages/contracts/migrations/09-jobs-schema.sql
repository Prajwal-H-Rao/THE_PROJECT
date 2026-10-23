-- Migration 09: jobs schema
-- Branch: 09
-- Creates resume_profile, job_listing, job_match, application_draft, application_submission
-- in the jobs_service schema. Profile version is immutable.

CREATE TABLE jobs_service.resume_profile (
    profile_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    version           INTEGER NOT NULL DEFAULT 1,
    headline          TEXT,
    summary           TEXT,
    skills            TEXT[] NOT NULL DEFAULT '{}',
    experience        JSONB NOT NULL DEFAULT '[]',
    education         JSONB NOT NULL DEFAULT '[]',
    certifications    JSONB NOT NULL DEFAULT '[]',
    languages         JSONB NOT NULL DEFAULT '[]',
    preferences       JSONB NOT NULL DEFAULT '{}',
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, version)
) AUTHORIZATION jobs_service;

CREATE INDEX idx_resume_profile_user_id ON jobs_service.resume_profile (user_id);
CREATE INDEX idx_resume_profile_active ON jobs_service.resume_profile (is_active);

CREATE TABLE jobs_service.job_listing (
    listing_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_run_id     UUID, -- references registry.job_source_run
    employer_id       TEXT,
    title             TEXT NOT NULL,
    company           TEXT NOT NULL,
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
    source_url        TEXT,
    raw_ref           TEXT, -- pointer to object store for raw listing
    fingerprint       CHAR(64) NOT NULL, -- SHA-256 for deduplication
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (fingerprint)
) AUTHORIZATION jobs_service;

CREATE INDEX idx_job_listing_source_run ON jobs_service.job_listing (source_run_id);
CREATE INDEX idx_job_listing_posted_at ON jobs_service.job_listing (posted_at);
CREATE INDEX idx_job_listing_location ON jobs_service.job_listing (location);

CREATE TABLE jobs_service.job_match (
    match_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id        UUID NOT NULL REFERENCES jobs_service.resume_profile (profile_id) ON DELETE CASCADE,
    listing_id        UUID NOT NULL REFERENCES jobs_service.job_listing (listing_id) ON DELETE CASCADE,
    score             NUMERIC(5, 4) NOT NULL, -- 0.0000 to 1.0000
    reasoning         TEXT,
    matched_skills    TEXT[] NOT NULL DEFAULT '{}',
    gaps              TEXT[] NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (profile_id, listing_id)
) AUTHORIZATION jobs_service;

CREATE INDEX idx_job_match_profile ON jobs_service.job_match (profile_id);
CREATE INDEX idx_job_match_listing ON jobs_service.job_match (listing_id);
CREATE INDEX idx_job_match_score ON jobs_service.job_match (score DESC);

CREATE TABLE jobs_service.application_draft (
    draft_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    profile_id        UUID NOT NULL REFERENCES jobs_service.resume_profile (profile_id) ON DELETE CASCADE,
    listing_id        UUID NOT NULL REFERENCES jobs_service.job_listing (listing_id) ON DELETE CASCADE,
    cover_letter      TEXT,
    custom_answers    JSONB NOT NULL DEFAULT '{}',
    status            TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'ready', 'submitted', 'withdrawn'
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, listing_id)
) AUTHORIZATION jobs_service;

CREATE INDEX idx_application_draft_user ON jobs_service.application_draft (user_id);
CREATE INDEX idx_application_draft_status ON jobs_service.application_draft (status);

CREATE TABLE jobs_service.application_submission (
    submission_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id          UUID NOT NULL REFERENCES jobs_service.application_draft (draft_id) ON DELETE CASCADE,
    submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmation_ref  TEXT, -- pointer to object store for confirmation
    status            TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'acknowledged', 'rejected', 'withdrawn'
    metadata          JSONB NOT NULL DEFAULT '{}'
) AUTHORIZATION jobs_service;

CREATE INDEX idx_application_submission_draft ON jobs_service.application_submission (draft_id);