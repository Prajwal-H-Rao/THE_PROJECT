-- Migration 10: TOTP secrets
-- Branch: 10
-- Creates table for TOTP secrets and backup codes (Task 3).

CREATE TABLE identity_service.totp_secrets (
    user_id           UUID PRIMARY KEY REFERENCES identity_service.users (user_id) ON DELETE CASCADE,
    secret            TEXT NOT NULL, -- base32 encoded TOTP secret
    backup_codes      TEXT[] NOT NULL DEFAULT '{}', -- HMAC-SHA256 hashed backup codes, one per code
    salt              TEXT NOT NULL, -- per-user salt for backup code hashing
    enabled_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    disabled_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION identity_service;

CREATE INDEX idx_totp_secrets_enabled ON identity_service.totp_secrets (user_id) WHERE disabled_at IS NULL;

-- Function to store TOTP secret and backup codes
CREATE OR REPLACE FUNCTION identity_service.create_totp_secret(
    p_user_id UUID,
    p_secret TEXT,
    p_backup_codes TEXT[],
    p_salt TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO identity_service.totp_secrets (user_id, secret, backup_codes, salt, enabled_at)
    VALUES (p_user_id, p_secret, p_backup_codes, p_salt, now())
    ON CONFLICT (user_id) DO UPDATE SET
        secret = EXCLUDED.secret,
        backup_codes = EXCLUDED.backup_codes,
        salt = EXCLUDED.salt,
        enabled_at = EXCLUDED.enabled_at,
        disabled_at = NULL,
        updated_at = now();
END;
$$;

-- Function to verify a backup code and consume it
CREATE OR REPLACE FUNCTION identity_service.verify_and_consume_backup_code(
    p_user_id UUID,
    p_code TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_salt TEXT;
    v_hashed_code TEXT;
    v_index INTEGER;
    v_new_codes TEXT[];
BEGIN
    SELECT salt, backup_codes INTO v_salt, v_new_codes
    FROM identity_service.totp_secrets
    WHERE user_id = p_user_id AND disabled_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    v_hashed_code := encode(hmac(v_salt || p_code, 'sha256'), 'hex');
    
    -- Find and remove the matching backup code
    FOR v_index IN 1..array_length(v_new_codes, 1) LOOP
        IF v_new_codes[v_index] = v_hashed_code THEN
            v_new_codes := array_remove(v_new_codes, v_hashed_code);
            UPDATE identity_service.totp_secrets
            SET backup_codes = v_new_codes, updated_at = now()
            WHERE user_id = p_user_id;
            RETURN TRUE;
        END IF;
    END LOOP;
    
    RETURN FALSE;
END;
$$;

-- Function to disable TOTP for a user
CREATE OR REPLACE FUNCTION identity_service.disable_totp(
    p_user_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.totp_secrets
    SET disabled_at = now(), updated_at = now()
    WHERE user_id = p_user_id AND disabled_at IS NULL;
    RETURN FOUND;
END;
$$;

-- Function to get TOTP secret for a user
CREATE OR REPLACE FUNCTION identity_service.get_totp_secret(
    p_user_id UUID
) RETURNS SETOF identity_service.totp_secrets LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM identity_service.totp_secrets
    WHERE user_id = p_user_id AND disabled_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION identity_service.create_totp_secret TO identity_service;
GRANT EXECUTE ON FUNCTION identity_service.verify_and_consume_backup_code TO identity_service;
GRANT EXECUTE ON FUNCTION identity_service.disable_totp TO identity_service;
GRANT EXECUTE ON FUNCTION identity_service.get_totp_secret TO identity_service;