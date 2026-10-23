-- Migration 20: unlink and revoke
-- Branch: 20
-- Implements unlink and revoke functionality (Task 12).
-- Revocation stops future access (spec:778).

-- Function to unlink a channel identity (soft delete)
CREATE OR REPLACE FUNCTION identity_service.unlink_channel_identity(
    p_user_id UUID,
    p_provider TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.channel_identities
    SET unlinked_at = now()
    WHERE user_id = p_user_id
      AND provider = p_provider
      AND unlinked_at IS NULL;
    RETURN FOUND;
END;
$$;

-- Function to revoke all sessions for a user
CREATE OR REPLACE FUNCTION identity_service.revoke_all_user_sessions(
    p_user_id UUID
) RETURNS INTEGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.sessions
    SET revoked_at = now()
    WHERE user_id = p_user_id
      AND revoked_at IS NULL;
    RETURN ROW_COUNT;
END;
$$;

-- Function to revoke all refresh tokens for a user
CREATE OR REPLACE FUNCTION identity_service.revoke_all_user_refresh_tokens(
    p_user_id UUID
) RETURNS INTEGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.refresh_tokens
    SET revoked_at = now()
    WHERE user_id = p_user_id
      AND revoked_at IS NULL;
    RETURN ROW_COUNT;
END;
$$;

-- Function to revoke all TOTP secrets for a user
CREATE OR REPLACE FUNCTION identity_service.revoke_user_totp(
    p_user_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM identity_service.totp_secrets
    WHERE user_id = p_user_id;
    RETURN FOUND;
END;
$$;

-- Function to revoke all access for a user (comprehensive revocation)
CREATE OR REPLACE FUNCTION identity_service.revoke_all_user_access(
    p_user_id UUID
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_sessions_revoked INTEGER;
    v_refresh_tokens_revoked INTEGER;
    v_totp_revoked BOOLEAN;
    v_channels_unlinked INTEGER;
BEGIN
    -- Revoke sessions
    v_sessions_revoked := identity_service.revoke_all_user_sessions(p_user_id);
    
    -- Revoke refresh tokens
    v_refresh_tokens_revoked := identity_service.revoke_all_user_refresh_tokens(p_user_id);
    
    -- Revoke TOTP
    v_totp_revoked := identity_service.revoke_user_totp(p_user_id);
    
    -- Unlink all channel identities
    UPDATE identity_service.channel_identities
    SET unlinked_at = now()
    WHERE user_id = p_user_id AND unlinked_at IS NULL;
    GET DIAGNOSTICS v_channels_unlinked = ROW_COUNT;

    RETURN jsonb_build_object(
        'sessions_revoked', v_sessions_revoked,
        'refresh_tokens_revoked', v_refresh_tokens_revoked,
        'totp_revoked', v_totp_revoked,
        'channels_unlinked', v_channels_unlinked,
        'revoked_at', now()
    );
END;
$$;

-- Function to revoke a specific session
CREATE OR REPLACE FUNCTION identity_service.revoke_session(
    p_session_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.sessions
    SET revoked_at = now()
    WHERE session_id = p_session_id
      AND revoked_at IS NULL;
    RETURN FOUND;
END;
$$;

-- Function to revoke a specific refresh token
CREATE OR REPLACE FUNCTION identity_service.revoke_refresh_token(
    p_token_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.refresh_tokens
    SET revoked_at = now()
    WHERE token_id = p_token_id
      AND revoked_at IS NULL;
    RETURN FOUND;
END;
$$;

-- Function to revoke a specific channel identity
CREATE OR REPLACE FUNCTION identity_service.revoke_channel_identity(
    p_identity_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.channel_identities
    SET unlinked_at = now()
    WHERE identity_id = p_identity_id
      AND unlinked_at IS NULL;
    RETURN FOUND;
END;
$$;

-- View to show all active access grants for a user
CREATE OR REPLACE VIEW identity_service.user_access_grants AS
SELECT 
    'session' AS grant_type,
    session_id AS grant_id,
    user_id,
    tenant_id,
    channel,
    issued_at AS granted_at,
    expires_at,
    revoked_at,
    NULL::TEXT AS provider
FROM identity_service.sessions
WHERE revoked_at IS NULL

UNION ALL

SELECT 
    'refresh_token' AS grant_type,
    token_id AS grant_id,
    user_id,
    NULL::TEXT AS tenant_id,
    provider AS channel,
    created_at AS granted_at,
    expires_at,
    revoked_at,
    provider
FROM identity_service.refresh_tokens
WHERE revoked_at IS NULL

UNION ALL

SELECT 
    'channel_identity' AS grant_type,
    identity_id AS grant_id,
    user_id,
    NULL::TEXT AS tenant_id,
    provider AS channel,
    linked_at AS granted_at,
    NULL::TIMESTAMPTZ AS expires_at,
    unlinked_at AS revoked_at,
    provider
FROM identity_service.channel_identities
WHERE unlinked_at IS NULL;

GRANT SELECT ON identity_service.user_access_grants TO identity_service;