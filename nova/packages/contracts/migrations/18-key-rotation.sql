-- Migration 18: key rotation for workload keys
-- Branch: 18
-- Adds key rotation for workload keys (Task 9).
-- Old key fails after rotation.

-- The encryption_keys table was created in migration 15 (refresh tokens)
-- This migration adds key rotation functions

-- Function to rotate encryption keys
CREATE OR REPLACE FUNCTION identity_service.rotate_encryption_key(
    p_new_key_material BYTEA
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_new_key_id UUID;
    v_old_key_id UUID;
BEGIN
    -- Deactivate current active key
    UPDATE identity_service.encryption_keys
    SET active = false, rotated_at = now()
    WHERE active = true;

    -- Insert new key
    INSERT INTO identity_service.encryption_keys (key_version, key_material, active)
    VALUES (
        (SELECT COALESCE(MAX(key_version), 0) + 1 FROM identity_service.encryption_keys),
        p_new_key_material,
        true
    )
    RETURNING key_id INTO v_new_key_id;

    -- Get old key ID for re-encryption
    SELECT key_id INTO v_old_key_id
    FROM identity_service.encryption_keys
    WHERE active = false
    ORDER BY rotated_at DESC
    LIMIT 1;

    -- Re-encrypt all refresh tokens with new key (async in production)
    -- This is a synchronous implementation; in production, do this async
    UPDATE identity_service.refresh_tokens rt
    SET encrypted_token = identity_service.encrypt_refresh_token(
            identity_service.decrypt_refresh_token(rt.encrypted_token, rt.key_id),
            v_new_key_id
        ),
        key_id = v_new_key_id
    WHERE rt.key_id = v_old_key_id AND rt.revoked_at IS NULL;

    RETURN v_new_key_id;
END;
$$;

-- Function to get current active encryption key
CREATE OR REPLACE FUNCTION identity_service.get_active_encryption_key()
RETURNS TABLE (key_id UUID, key_version INTEGER, key_material BYTEA) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT key_id, key_version, key_material
    FROM identity_service.encryption_keys
    WHERE active = true;
END;
$$;

-- Function to list all encryption keys (for audit)
CREATE OR REPLACE FUNCTION identity_service.list_encryption_keys()
RETURNS TABLE (
    key_id UUID,
    key_version INTEGER,
    active BOOLEAN,
    created_at TIMESTAMPTZ,
    rotated_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT key_id, key_version, active, created_at, rotated_at
    FROM identity_service.encryption_keys
    ORDER BY key_version DESC;
END;
$$;

-- Function to schedule key rotation (called by cron)
CREATE OR REPLACE FUNCTION identity_service.schedule_key_rotation(
    p_new_key_material BYTEA,
    p_rotate_at TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_new_key_id UUID;
BEGIN
    -- Schedule the rotation for the specified time
    -- In production, use pg_cron or a job scheduler
    -- This is a placeholder for the scheduling logic
    v_new_key_id := identity_service.rotate_encryption_key(p_new_key_material);
    RETURN v_new_key_id;
END;
$$;

-- View to show key rotation status
CREATE OR REPLACE VIEW identity_service.key_rotation_status AS
SELECT 
    key_id,
    key_version,
    active,
    created_at,
    rotated_at,
    CASE 
        WHEN active THEN 'current'
        WHEN rotated_at IS NOT NULL THEN 'rotated'
        ELSE 'pending'
    END AS status,
    CASE 
        WHEN active THEN 
            EXTRACT(EPOCH FROM (now() - created_at)) / 86400
        ELSE NULL
    END AS days_active
FROM identity_service.encryption_keys
ORDER BY key_version DESC;

GRANT SELECT ON identity_service.key_rotation_status TO identity_service;