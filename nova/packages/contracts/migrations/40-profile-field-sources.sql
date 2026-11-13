-- Migration 40: profile field sources and version use
-- Branch: 40
-- Extends resume_profile with per-field sources, confirmed-by-user flags, extracted and
-- used timestamps and the work-authorisation field (spec:522, spec:535).
-- Records the profile version a match or draft referenced (spec:540).

ALTER TABLE jobs_service.resume_profile
    ADD COLUMN field_sources    JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN confirmed_fields TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN extracted_at     TIMESTAMPTZ,
    ADD COLUMN used_at          TIMESTAMPTZ,
    ADD COLUMN work_auth        TEXT;

ALTER TABLE jobs_service.job_match
    ADD COLUMN profile_version INTEGER;

ALTER TABLE jobs_service.application_draft
    ADD COLUMN profile_version INTEGER;
