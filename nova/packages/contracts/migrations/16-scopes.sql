-- Migration 16: scopes per integration and per user
-- Branch: 16
-- Creates scopes tables for per-integration and per-user scopes (Task 6).
-- Scope escalation fails (spec:785).

CREATE TABLE identity_service.integration_scopes (
    scope_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name  TEXT NOT NULL, -- 'google', 'github', 'gmail', 'calendar', etc.
    scope_name        TEXT NOT NULL, -- e.g., 'https://www.googleapis.com/auth/gmail.readonly'
    description       TEXT,
    is_sensitive      BOOLEAN NOT NULL DEFAULT false, -- requires step-up auth
    required          BOOLEAN NOT NULL DEFAULT false, -- mandatory for integration
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (integration_name, scope_name)
) AUTHORIZATION identity_service;

CREATE TABLE identity_service.user_scopes (
    user_scope_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES identity_service.users (user_id) ON DELETE CASCADE,
    integration_name  TEXT NOT NULL,
    scope_name        TEXT NOT NULL,
    granted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at        TIMESTAMPTZ,
    granted_by        TEXT NOT NULL DEFAULT 'user', -- 'user', 'system', 'admin'
    UNIQUE (user_id, integration_name, scope_name)
) AUTHORIZATION identity_service;

CREATE INDEX idx_user_scopes_user_id ON identity_service.user_scopes (user_id);
CREATE INDEX idx_user_scopes_integration ON identity_service.user_scopes (integration_name);

-- Function to grant a scope to a user
CREATE OR REPLACE FUNCTION identity_service.grant_user_scope(
    p_user_id UUID,
    p_integration_name TEXT,
    p_scope_name TEXT,
    p_granted_by TEXT DEFAULT 'user'
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_user_scope_id UUID;
BEGIN
    -- Verify the scope exists for this integration
    IF NOT EXISTS (
        SELECT 1 FROM identity_service.integration_scopes
        WHERE integration_name = p_integration_name
          AND scope_name = p_scope_name
    ) THEN
        RAISE EXCEPTION 'Scope % not defined for integration %', p_scope_name, p_integration_name;
    END IF;

    INSERT INTO identity_service.user_scopes (user_id, integration_name, scope_name, granted_by)
    VALUES (p_user_id, p_integration_name, p_scope_name, p_granted_by)
    ON CONFLICT (user_id, integration_name, scope_name) DO UPDATE SET
        revoked_at = NULL,
        granted_at = now(),
        granted_by = EXCLUDED.granted_by
    RETURNING user_scope_id INTO v_user_scope_id;

    RETURN v_user_scope_id;
END;
$$;

-- Function to revoke a user scope
CREATE OR REPLACE FUNCTION identity_service.revoke_user_scope(
    p_user_id UUID,
    p_integration_name TEXT,
    p_scope_name TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.user_scopes
    SET revoked_at = now()
    WHERE user_id = p_user_id
      AND integration_name = p_integration_name
      AND scope_name = p_scope_name
      AND revoked_at IS NULL;
    RETURN FOUND;
END;
$$;

-- Function to check if user has a scope
CREATE OR REPLACE FUNCTION identity_service.user_has_scope(
    p_user_id UUID,
    p_integration_name TEXT,
    p_scope_name TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM identity_service.user_scopes
        WHERE user_id = p_user_id
          AND integration_name = p_integration_name
          AND scope_name = p_scope_name
          AND revoked_at IS NULL
    );
END;
$$;

-- Function to get all active scopes for a user
CREATE OR REPLACE FUNCTION identity_service.get_user_scopes(
    p_user_id UUID
) RETURNS SETOF identity_service.user_scopes LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM identity_service.user_scopes
    WHERE user_id = p_user_id AND revoked_at IS NULL;
END;
$$;

-- Function to check scope escalation (prevents scope escalation)
CREATE OR REPLACE FUNCTION identity_service.check_scope_escalation(
    p_user_id UUID,
    p_requested_integration TEXT,
    p_requested_scope TEXT,
    p_granted_scopes JSONB -- array of {integration, scope}
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_requested_sensitive BOOLEAN;
    v_granted_sensitive BOOLEAN;
BEGIN
    -- Check if requested scope is sensitive
    SELECT is_sensitive INTO v_requested_sensitive
    FROM identity_service.integration_scopes
    WHERE integration_name = p_requested_integration
      AND scope_name = p_requested_scope;

    IF v_requested_sensitive THEN
        -- Check if user has any sensitive scope already granted for this integration
        SELECT EXISTS (
            SELECT 1 FROM identity_service.user_scopes us
            JOIN identity_service.integration_scopes ins
              ON us.integration_name = ins.integration_name
             AND us.scope_name = ins.scope_name
            WHERE us.user_id = p_user_id
              AND us.integration_name = p_requested_integration
              AND ins.is_sensitive = true
              AND us.revoked_at IS NULL
        ) INTO v_granted_sensitive;

        IF NOT v_granted_sensitive THEN
            RETURN false; -- Scope escalation: requesting sensitive scope without prior sensitive grant
        END IF;
    END IF;

    RETURN true;
END;
$$;