-- Migration 39: employer_aliases table
-- Branch: 39
-- Creates employer_aliases table in employer_registry_service schema.
-- Records alias relationships in a separate reviewed table (spec:1546).
-- An alias naming a legitimate subsidiary not yet in employer_targets is
-- stored with a NULL target_employer_id and reviewed = false, so no alias
-- is ever silently discarded. Review resolves the target later.
-- Deliberate choice: no ON DELETE clause on either FK. Postgres default
-- NO ACTION blocks deletion of a referenced employer instead of silently
-- cascade-deleting recorded alias rows (spec:1546 forbids silent discard).

CREATE TABLE employer_registry_service.employer_aliases (
  alias_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_employer_id UUID NOT NULL REFERENCES employer_registry_service.employer_targets (employer_id),
  target_employer_id UUID REFERENCES employer_registry_service.employer_targets (employer_id),
  alias_name         TEXT NOT NULL,
  normalized_alias   TEXT NOT NULL,
  alias_type         TEXT NOT NULL,
  confidence         REAL,
  reviewed           BOOLEAN NOT NULL DEFAULT false,
  reviewed_by        TEXT,
  reviewed_at        TIMESTAMPTZ
) AUTHORIZATION employer_registry_service;

CREATE INDEX idx_employer_aliases_source ON employer_registry_service.employer_aliases (source_employer_id);
CREATE INDEX idx_employer_aliases_reviewed ON employer_registry_service.employer_aliases (reviewed);
