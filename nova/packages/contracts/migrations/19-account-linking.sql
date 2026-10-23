-- Migration 19: account linking nonce
-- Branch: 19
-- Creates account linking nonce table (Task 11).
-- One-time nonce issued only from a logged-in session (spec:778).

CREATE TABLE identity_service.account_linking_nonces (
    nonce_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES identity_service.users (user_id) ON DELETE CASCADE,
    provider          TEXT NOT NULL, -- 'google', 'github', 'telegram', 'whatsapp', 'email'
    provider_user_id  TEXT, -- filled after callback
    nonce             TEXT NOT NULL UNIQUE,
    redirect_uri      TEXT NOT NULL,
    state             TEXT NOT NULL UNIQUE, -- PKCE state
    code_verifier     TEXT NOT NULL, -- PKCE code verifier
    expires_at        TIMESTAMPTZ NOT NULL,
    consumed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION identity_service;

CREATE INDEX idx_account_linking_nonces_user_id ON identity_service.account_linking_nonces (user_id);
CREATE INDEX idx_account_linking_nonces_nonce ON identity_service.account_linking_nonces (nonce);
CREATE INDEX idx_account_linking_nonces_state ON identity_service.account_linking_nonces (state);
CREATE INDEX idx_account_linking_nonces_expires_at ON identity_service.account_linking_nonces (expires_at);

-- Function to create an account linking nonce
CREATE OR REPLACE FUNCTION identity_service.create_account_linking_nonce(
    p_user_id UUID,
    p_provider TEXT,
    p_redirect_uri TEXT,
    p_ttl_minutes INTEGER DEFAULT 10
) RETURNS TABLE (nonce TEXT, state TEXT, code_verifier TEXT) LANGUAGE plpgsql AS $$
DECLARE
    v_nonce TEXT;
    v_state TEXT;
    v_code_verifier TEXT;
    v_code_challenge TEXT;
BEGIN
    v_nonce := encode(gen_random_bytes(16), 'base64url');
    v_state := encode(gen_random_bytes(24), 'base64url');
    v_code_verifier := encode(gen_random_bytes(32), 'base64url');
    v_code_challenge := encode(digest(v_code_verifier, 'sha256'), 'base64url');

    INSERT INTO identity_service.account_linking_nonces (
        user_id, provider, nonce, redirect_uri, state, code_verifier, code_challenge, expires_at
    ) VALUES (
        p_user_id, p_provider, v_nonce, p_redirect_uri, v_state, v_code_verifier, v_code_challenge,
        now() + (p_ttl_minutes || ' minutes')::INTERVAL
    );

    RETURN QUERY SELECT v_nonce, v_state, v_code_verifier;
END;
$$ LANGUAGE plpgsql;

-- Function to consume an account linking nonce
CREATE OR REPLACE FUNCTION identity_service.consume_account_linking_nonce(
    p_nonce TEXT,
    p_state TEXT
) RETURNS TABLE (
    user_id UUID,
    provider TEXT,
    redirect_uri TEXT,
    code_verifier TEXT,
    code_challenge TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- Find and consume the nonce (single-use)
    UPDATE identity_service.account_linking_nonces
    SET consumed_at = now(),
        state = p_state
    WHERE nonce = p_nonce
      AND consumed_at IS NULL
      AND expires_at > now()
    RETURNING user_id, provider, redirect_uri, code_verifier, code_challenge
    INTO v_record;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired nonce: %', p_nonce
        USING ERRCODE = 'invalid_token';
    END IF;

    RETURN QUERY SELECT v_record.user_id, v_record.provider, v_record.redirect_uri, v_record.code_verifier, v_record.code_challenge;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired nonces
CREATE OR REPLACE FUNCTION identity_service.cleanup_account_linking_nonces()
RETURNS INTEGER LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM identity_service.account_linking_nonces
    WHERE expires_at <= now() OR consumed_at IS NOT NULL;
    RETURN ROW_COUNT;
END;
$$ LANGUAGE plpgsql;

-- Function to validate that a nonce was minted from a logged-in session
CREATE OR REPLACE FUNCTION identity_service.validate_nonce_origin(
    p_nonce TEXT,
    p_session_user_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id
    FROM identity_service.account_linking_nonces
    WHERE nonce = p_nonce;

    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN v_user_id = p_session_user_id;
END;
$$ LANGUAGE plpgsql;