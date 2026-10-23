-- Migration 21: rate limiting and account lockout
-- Branch: 21
-- Adds rate limiting and account lockout (Task 14).
-- Lockout triggers and recovers.

CREATE TABLE identity_service.rate_limit_counters (
    counter_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier        TEXT NOT NULL,
    action            TEXT NOT NULL,
    count             INTEGER NOT NULL DEFAULT 1,
    window_start      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at        TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (identifier, action, window_start)
) AUTHORIZATION identity_service;

CREATE INDEX idx_rate_limit_identifier_action ON identity_service.rate_limit_counters (identifier, action);
CREATE INDEX idx_rate_limit_expires_at ON identity_service.rate_limit_counters (expires_at);

CREATE TABLE identity_service.account_lockouts (
    lockout_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES identity_service.users (user_id) ON DELETE CASCADE,
    reason            TEXT NOT NULL,
    failed_attempts   INTEGER NOT NULL DEFAULT 0,
    locked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    unlock_at         TIMESTAMPTZ,
    unlocked_at       TIMESTAMPTZ,
    unlocked_by       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION identity_service;

CREATE INDEX idx_account_lockouts_user_id ON identity_service.account_lockouts (user_id);
CREATE INDEX idx_account_lockouts_unlock_at ON identity_service.account_lockouts (unlock_at);

CREATE OR REPLACE FUNCTION identity_service.check_rate_limit(
    p_identifier TEXT,
    p_action TEXT,
    p_max_attempts INTEGER,
    p_window_minutes INTEGER
) RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ) LANGUAGE plpgsql AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_window_start TIMESTAMPTZ;
    v_expires_at TIMESTAMPTZ;
    v_count INTEGER;
    v_allowed BOOLEAN;
    v_remaining INTEGER;
BEGIN
    v_window_start := date_trunc('minute', v_now) - (EXTRACT(minute FROM v_now)::INTEGER % p_window_minutes) * INTERVAL '1 minute';
    v_expires_at := v_window_start + (p_window_minutes || ' minutes')::INTERVAL;

    INSERT INTO identity_service.rate_limit_counters (identifier, action, count, window_start, expires_at)
    VALUES (p_identifier, p_action, 1, v_window_start, v_expires_at)
    ON CONFLICT (identifier, action, window_start) DO UPDATE SET
        count = rate_limit_counters.count + 1
    RETURNING count INTO v_count;

    v_allowed := v_count <= p_max_attempts;
    v_remaining := GREATEST(0, p_max_attempts - v_count);

    RETURN QUERY SELECT v_allowed, v_remaining, v_expires_at;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION identity_service.lock_account(
    p_user_id UUID,
    p_reason TEXT,
    p_lockout_minutes INTEGER DEFAULT 30
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_lockout_id UUID;
BEGIN
    INSERT INTO identity_service.account_lockouts (user_id, reason, failed_attempts, locked_at, unlock_at)
    VALUES (p_user_id, p_reason, 1, now(), now() + (p_lockout_minutes || ' minutes')::INTERVAL)
    ON CONFLICT (user_id) DO UPDATE SET
        reason = EXCLUDED.reason,
        failed_attempts = account_lockouts.failed_attempts + 1,
        locked_at = EXCLUDED.locked_at,
        unlock_at = EXCLUDED.unlock_at
    RETURNING lockout_id INTO v_lockout_id;

    RETURN v_lockout_id;
END;
$$;

CREATE OR REPLACE FUNCTION identity_service.unlock_account(
    p_user_id UUID,
    p_unlocked_by TEXT DEFAULT 'auto'
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.account_lockouts
    SET unlocked_at = now(),
        unlocked_by = p_unlocked_by
    WHERE user_id = p_user_id
      AND unlocked_at IS NULL;
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION identity_service.is_account_locked(
    p_user_id UUID
) RETURNS TABLE (locked BOOLEAN, reason TEXT, unlock_at TIMESTAMPTZ) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        unlock_at > now() AS locked,
        reason,
        unlock_at
    FROM identity_service.account_lockouts
    WHERE user_id = p_user_id
      AND unlocked_at IS NULL
      AND unlock_at > now()
    ORDER BY locked_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION identity_service.record_failed_login(
    p_user_id UUID,
    p_ip_address TEXT,
    p_reason TEXT DEFAULT 'failed_login'
) RETURNS TABLE (locked BOOLEAN, lockout_id UUID, unlock_at TIMESTAMPTZ) LANGUAGE plpgsql AS $$
DECLARE
    v_lockout_id UUID;
    v_locked BOOLEAN;
    v_unlock_at TIMESTAMPTZ;
BEGIN
    PERFORM identity_service.check_rate_limit(p_ip_address, 'login', 5, 15);

    SELECT locked, lockout_id, unlock_at INTO v_locked, v_lockout_id, v_unlock_at
    FROM identity_service.is_account_locked(p_user_id);

    IF v_locked THEN
        RETURN QUERY SELECT true, v_lockout_id, v_unlock_at;
    END IF;

    PERFORM identity_service.check_rate_limit(p_user_id::TEXT, 'login', 5, 15);

    INSERT INTO identity_service.account_lockouts (user_id, reason, failed_attempts, locked_at, unlock_at)
    VALUES (p_user_id, p_reason, 1, now(), now() + INTERVAL '30 minutes')
    ON CONFLICT (user_id) DO UPDATE SET
        failed_attempts = account_lockouts.failed_attempts + 1,
        locked_at = now(),
        unlock_at = now() + INTERVAL '30 minutes'
    RETURNING lockout_id, unlock_at INTO v_lockout_id, v_unlock_at;

    IF (SELECT failed_attempts FROM identity_service.account_lockouts WHERE user_id = p_user_id) >= 5 THEN
        RETURN QUERY SELECT true, v_lockout_id, v_unlock_at;
    END IF;

    RETURN QUERY SELECT false, NULL::UUID, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION identity_service.clear_failed_attempts(
    p_user_id UUID
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM identity_service.account_lockouts
    WHERE user_id = p_user_id AND unlocked_at IS NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION identity_service.cleanup_rate_limits()
RETURNS INTEGER LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM identity_service.rate_limit_counters
    WHERE expires_at <= now();
    RETURN ROW_COUNT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION identity_service.cleanup_lockouts()
RETURNS INTEGER LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM identity_service.account_lockouts
    WHERE unlock_at <= now() AND unlocked_at IS NULL;
    RETURN ROW_COUNT;
END;
$$ LANGUAGE plpgsql;
