-- Migration 17: OIDC states for PKCE
-- Branch: 17
-- Creates table for OIDC authorization state with PKCE verifier and nonce (Task 1).

CREATE TABLE identity_service.oidc_states (
    state            TEXT PRIMARY KEY,
    provider         TEXT NOT NULL, -- 'google', 'github'
    code_verifier    TEXT NOT NULL, -- PKCE code verifier
    nonce            TEXT NOT NULL, -- OIDC nonce
    redirect_uri     TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ NOT NULL,
    consumed_at      TIMESTAMPTZ
) AUTHORIZATION identity_service;

CREATE INDEX idx_oidc_states_expires_at ON identity_service.oidc_states (expires_at);
CREATE INDEX idx_oidc_states_provider ON identity_service.oidc_states (provider);

-- Function to create an OIDC state record
CREATE OR REPLACE FUNCTION identity_service.create_oidc_state(
    p_state TEXT,
    p_provider TEXT,
    p_code_verifier TEXT,
    p_nonce TEXT,
    p_redirect_uri TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO identity_service.oidc_states
        (state, provider, code_verifier, nonce, redirect_uri, created_at, expires_at)
    VALUES (p_state, p_provider, p_code_verifier, p_nonce, p_redirect_uri, now(), now() + interval '10 minutes');
END;
$$;

-- Function to consume an OIDC state record (single-use)
CREATE OR REPLACE FUNCTION identity_service.consume_oidc_state(
    p_state TEXT
) RETURNS SETOF identity_service.oidc_states LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    UPDATE identity_service.oidc_states
    SET consumed_at = now()
    WHERE state = p_state
      AND consumed_at IS NULL
      AND expires_at > now()
    RETURNING *;
END;
$$;

-- Function to find an OIDC state record
CREATE OR REPLACE FUNCTION identity_service.find_oidc_state(
    p_state TEXT
) RETURNS SETOF identity_service.oidc_states LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM identity_service.oidc_states WHERE state = p_state;
END;
$$;

-- Function to delete expired OIDC states
CREATE OR REPLACE FUNCTION identity_service.delete_expired_oidc_states()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM identity_service.oidc_states WHERE expires_at <= now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION identity_service.create_oidc_state TO identity_service;
GRANT EXECUTE ON FUNCTION identity_service.consume_oidc_state TO identity_service;
GRANT EXECUTE ON FUNCTION identity_service.find_oidc_state TO identity_service;
GRANT EXECUTE ON FUNCTION identity_service.delete_expired_oidc_states TO identity_service;