-- Migration 14: password reset tokens
-- Branch: 14
-- Creates password_reset_tokens table for email+OTP password reset (Task 4).
-- Token is single-use and time-boxed (spec:236).

CREATE TABLE identity_service.password_reset_tokens (
    token_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES identity_service.users (user_id) ON DELETE CASCADE,
    token_hash        TEXT NOT NULL, -- SHA-256 hash of the OTP
    email             TEXT NOT NULL,
    expires_at        TIMESTAMPTZ NOT NULL,
    consumed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION identity_service;

CREATE INDEX idx_password_reset_tokens_user_id ON identity_service.password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON identity_service.password_reset_tokens (expires_at);

-- Function to create a password reset token
CREATE OR REPLACE FUNCTION identity_service.create_password_reset_token(
    p_user_id UUID,
    p_email TEXT,
    p_otp TEXT,
    p_ttl_minutes INTEGER DEFAULT 15
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_token_id UUID;
    v_token_hash TEXT;
BEGIN
    v_token_hash := encode(digest(p_otp, 'sha256'), 'hex');
    INSERT INTO identity_service.password_reset_tokens (user_id, token_hash, email, expires_at)
    VALUES (p_user_id, v_token_hash, p_email, now() + (p_ttl_minutes || ' minutes')::INTERVAL)
    RETURNING token_id INTO v_token_id;
    RETURN v_token_id;
END;
$$;

-- Function to verify and consume a password reset token
CREATE OR REPLACE FUNCTION identity_service.verify_password_reset_token(
    p_email TEXT,
    p_otp TEXT
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_token_id UUID;
    v_token_hash TEXT;
BEGIN
    v_token_hash := encode(digest(p_otp, 'sha256'), 'hex');
    UPDATE identity_service.password_reset_tokens
    SET consumed_at = now()
    WHERE email = p_email
      AND token_hash = v_token_hash
      AND consumed_at IS NULL
      AND expires_at > now()
    RETURNING token_id INTO v_token_id;
    RETURN v_token_id;
END;
$$;