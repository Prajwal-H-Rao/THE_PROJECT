-- Migration 15: refresh tokens with envelope encryption
-- Branch: 15
-- Creates refresh_tokens table with envelope encryption for OAuth refresh tokens (Task 5).
-- Encrypts OAuth refresh tokens at rest with envelope encryption (spec:787).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Master key for envelope encryption (in production, use a KMS)
-- This is a placeholder; in production, the master key should come from a KMS
CREATE TABLE identity_service.encryption_keys (
    key_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_version   INTEGER NOT NULL DEFAULT 1,
    key_material  BYTEA NOT NULL, -- encrypted master key (encrypted by KMS)
    active        BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    rotated_at    TIMESTAMPTZ
) AUTHORIZATION identity_service;

CREATE TABLE identity_service.refresh_tokens (
    token_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES identity_service.users (user_id) ON DELETE CASCADE,
    provider        TEXT NOT NULL, -- 'google', 'github'
    encrypted_token BYTEA NOT NULL, -- envelope-encrypted refresh token
    key_id          UUID NOT NULL REFERENCES identity_service.encryption_keys (key_id),
    scope           TEXT NOT NULL,
    expires_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION identity_service;

CREATE INDEX idx_refresh_tokens_user_id ON identity_service.refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_provider ON identity_service.refresh_tokens (provider);

-- Function to encrypt a refresh token using envelope encryption
CREATE OR REPLACE FUNCTION identity_service.encrypt_refresh_token(
    p_plaintext TEXT,
    p_key_id UUID
) RETURNS BYTEA LANGUAGE plpgsql AS $$
DECLARE
    v_key_material BYTEA;
    v_dek BYTEA;
    v_encrypted_dek BYTEA;
    v_encrypted_token BYTEA;
BEGIN
    -- Get the master key material for this key version
    SELECT key_material INTO v_key_material
    FROM identity_service.encryption_keys
    WHERE key_id = p_key_id AND active = true;

    IF v_key_material IS NULL THEN
        RAISE EXCEPTION 'Encryption key not found or inactive: %', p_key_id;
    END IF;

    -- Generate a data encryption key (DEK)
    v_dek := gen_random_bytes(32);

    -- Encrypt the DEK with the master key (envelope encryption)
    v_encrypted_dek := pgp_sym_encrypt(v_dek, v_key_material);

    -- Encrypt the plaintext token with the DEK
    v_encrypted_token := pgp_sym_encrypt(p_plaintext, v_dek);

    -- Return concatenated: encrypted_dek || encrypted_token
    RETURN v_encrypted_dek || v_encrypted_token;
END;
$$;

-- Function to decrypt a refresh token
CREATE OR REPLACE FUNCTION identity_service.decrypt_refresh_token(
    p_encrypted BYTEA,
    p_key_id UUID
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_key_material BYTEA;
    v_dek_len INTEGER := 32;
    v_encrypted_dek BYTEA;
    v_encrypted_token BYTEA;
    v_dek BYTEA;
    v_plaintext TEXT;
BEGIN
    -- Get the master key material
    SELECT key_material INTO v_key_material
    FROM identity_service.encryption_keys
    WHERE key_id = p_key_id;

    IF v_key_material IS NULL THEN
        RAISE EXCEPTION 'Encryption key not found: %', p_key_id;
    END IF;

    -- Extract encrypted DEK (first 32+overhead bytes) and encrypted token
    -- pgp_sym_encrypt adds overhead; we need to know the DEK size
    -- For simplicity, we store the DEK length prefix
    -- This is a simplified implementation
    v_encrypted_dek := substring(p_encrypted FROM 1 FOR 88); -- pgp_sym_encrypt overhead for 32-byte key
    v_encrypted_token := substring(p_encrypted FROM 89);

    -- Decrypt the DEK
    v_dek := pgp_sym_decrypt(v_encrypted_dek, v_key_material);

    -- Decrypt the token
    v_plaintext := pgp_sym_decrypt(v_encrypted_token, v_dek);

    RETURN v_plaintext;
END;
$$;

-- Function to store a refresh token
CREATE OR REPLACE FUNCTION identity_service.store_refresh_token(
    p_user_id UUID,
    p_provider TEXT,
    p_refresh_token TEXT,
    p_scope TEXT,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_key_id UUID;
    v_encrypted BYTEA;
    v_token_id UUID;
BEGIN
    -- Get active encryption key
    SELECT key_id INTO v_key_id
    FROM identity_service.encryption_keys
    WHERE active = true
    ORDER BY key_version DESC
    LIMIT 1;

    IF v_key_id IS NULL THEN
        RAISE EXCEPTION 'No active encryption key available';
    END IF;

    v_encrypted := identity_service.encrypt_refresh_token(p_refresh_token, v_key_id);

    INSERT INTO identity_service.refresh_tokens (user_id, provider, encrypted_token, key_id, scope, expires_at)
    VALUES (p_user_id, p_provider, v_encrypted, v_key_id, p_scope, p_expires_at)
    RETURNING token_id INTO v_token_id;

    RETURN v_token_id;
END;
$$;

-- Function to retrieve and decrypt a refresh token
CREATE OR REPLACE FUNCTION identity_service.get_refresh_token(
    p_token_id UUID
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_record RECORD;
    v_plaintext TEXT;
BEGIN
    SELECT * INTO v_record
    FROM identity_service.refresh_tokens
    WHERE token_id = p_token_id
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now());

    IF v_record IS NULL THEN
        RETURN NULL;
    END IF;

    v_plaintext := identity_service.decrypt_refresh_token(v_record.encrypted_token, v_record.key_id);
    RETURN v_plaintext;
END;
$$;

-- Function to revoke a refresh token
CREATE OR REPLACE FUNCTION identity_service.revoke_refresh_token(
    p_token_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.refresh_tokens
    SET revoked_at = now()
    WHERE token_id = p_token_id AND revoked_at IS NULL;
    RETURN FOUND;
END;
$$;

-- Function to revoke all refresh tokens for a user
CREATE OR REPLACE FUNCTION identity_service.revoke_all_refresh_tokens(
    p_user_id UUID
) RETURNS INTEGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.refresh_tokens
    SET revoked_at = now()
    WHERE user_id = p_user_id AND revoked_at IS NULL;
    RETURN ROW_COUNT;
END;
$$;