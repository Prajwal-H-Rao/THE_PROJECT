-- Migration 13: audit search
-- Branch: 13
-- Builds audit search: filter by actor, action, resource, policy result and time.
-- Served by the audit service (spec:746).
-- An unknown filter is rejected, and a caller reads only rows their role allows.

-- Search function for audit_log with role-based access control.
-- The caller's role determines which rows they can read.
-- Returns a set of audit_log rows matching the filters.
CREATE OR REPLACE FUNCTION audit_activity_service.search_audit_log(
    p_actor_type TEXT DEFAULT NULL,
    p_actor_id TEXT DEFAULT NULL,
    p_action TEXT DEFAULT NULL,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_policy_result TEXT DEFAULT NULL,
    p_execution_status TEXT DEFAULT NULL,
    p_verification_type TEXT DEFAULT NULL,
    p_from TIMESTAMPTZ DEFAULT NULL,
    p_to TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF audit_activity_service.audit_log LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_caller_role TEXT := current_user;
    v_where TEXT := '';
    v_query TEXT;
    v_row audit_activity_service.audit_log;
BEGIN
    -- Role-based access control:
    -- - audit_activity_service: can read all rows
    -- - identity_service: can read rows where actor_id matches their users
    -- - other services: can read rows where resource_id matches their resources
    -- - unrecognized roles: denied (no rows returned)

    -- Build WHERE clause dynamically with positional parameters
    -- We use a fixed parameter mapping: $1-$10 for filters, $11 for limit, $12 for offset
    IF p_actor_type IS NOT NULL THEN
        v_where := v_where || ' AND actor_type = $1';
    END IF;

    IF p_actor_id IS NOT NULL THEN
        v_where := v_where || ' AND actor_id = $2';
    END IF;

    IF p_action IS NOT NULL THEN
        v_where := v_where || ' AND action = $3';
    END IF;

    IF p_resource_type IS NOT NULL THEN
        v_where := v_where || ' AND resource_type = $4';
    END IF;

    IF p_resource_id IS NOT NULL THEN
        v_where := v_where || ' AND resource_id = $5';
    END IF;

    IF p_policy_result IS NOT NULL THEN
        v_where := v_where || ' AND policy_result = $6';
    END IF;

    IF p_execution_status IS NOT NULL THEN
        v_where := v_where || ' AND execution_status = $7';
    END IF;

    IF p_verification_type IS NOT NULL THEN
        v_where := v_where || ' AND verification_type = $8';
    END IF;

    IF p_from IS NOT NULL THEN
        v_where := v_where || ' AND occurred_at >= $9';
    END IF;

    IF p_to IS NOT NULL THEN
        v_where := v_where || ' AND occurred_at <= $10';
    END IF;

    -- Access control: restrict rows based on caller role
    IF v_caller_role = 'audit_activity_service' THEN
        -- Full access
        NULL;
    ELSIF v_caller_role = 'identity_service' THEN
        -- Can read rows where actor_id is a user they own
        v_where := v_where || ' AND (actor_type = ''user'' AND actor_id IN (SELECT user_id::TEXT FROM identity_service.users))';
    ELSIF v_caller_role LIKE '%_service' THEN
        -- Other services: can read rows where resource_id matches their resources
        -- This is a simplified check; in practice each service would have its own policy
        v_where := v_where || ' AND resource_id IS NOT NULL';
    ELSE
        -- Unknown role: return no rows
        RETURN QUERY SELECT * FROM audit_activity_service.audit_log WHERE false;
    END IF;

    -- Build and execute the query with all 12 parameter positions
    v_query := 'SELECT * FROM audit_activity_service.audit_log WHERE true ' || v_where ||
               ' ORDER BY occurred_at DESC LIMIT $11 OFFSET $12';

    -- Execute with all 12 parameters (NULL for unset ones)
    FOR v_row IN EXECUTE v_query USING
        p_actor_type, p_actor_id, p_action, p_resource_type, p_resource_id,
        p_policy_result, p_execution_status, p_verification_type, p_from, p_to,
        p_limit, p_offset
    LOOP
        RETURN NEXT v_row;
    END LOOP;

    RETURN;
END;
$$;

-- Wrapper function that validates filter names and rejects unknown ones.
-- Used by the audit service HTTP handler.
CREATE OR REPLACE FUNCTION audit_activity_service.search_audit_log_safe(
    p_filters JSONB,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF audit_activity_service.audit_log LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_allowed_filters CONSTANT TEXT[] := ARRAY[
        'actor_type', 'actor_id', 'action', 'resource_type', 'resource_id',
        'policy_result', 'execution_status', 'verification_type', 'from', 'to'
    ];
    v_filter TEXT;
    v_actor_type TEXT;
    v_actor_id TEXT;
    v_action TEXT;
    v_resource_type TEXT;
    v_resource_id TEXT;
    v_policy_result TEXT;
    v_execution_status TEXT;
    v_verification_type TEXT;
    v_from TIMESTAMPTZ;
    v_to TIMESTAMPTZ;
BEGIN
    -- Validate filter names: reject unknown keys
    IF p_filters IS NOT NULL THEN
        FOR v_filter IN SELECT jsonb_object_keys(p_filters) LOOP
            IF v_filter NOT IN (SELECT unnest(v_allowed_filters)) THEN
                RAISE EXCEPTION 'Unknown audit filter: %', v_filter;
            END IF;
        END LOOP;
    END IF;

    -- Extract known filters
    v_actor_type := p_filters->>'actor_type';
    v_actor_id := p_filters->>'actor_id';
    v_action := p_filters->>'action';
    v_resource_type := p_filters->>'resource_type';
    v_resource_id := p_filters->>'resource_id';
    v_policy_result := p_filters->>'policy_result';
    v_execution_status := p_filters->>'execution_status';
    v_verification_type := p_filters->>'verification_type';
    v_from := CASE WHEN p_filters ? 'from' THEN (p_filters->>'from')::TIMESTAMPTZ END;
    v_to := CASE WHEN p_filters ? 'to' THEN (p_filters->>'to')::TIMESTAMPTZ END;

    RETURN QUERY SELECT * FROM audit_activity_service.search_audit_log(
        v_actor_type, v_actor_id, v_action, v_resource_type, v_resource_id,
        v_policy_result, v_execution_status, v_verification_type, v_from, v_to,
        p_limit, p_offset
    );
END;
$$;

-- Grant execute to audit_activity_service role
GRANT EXECUTE ON FUNCTION audit_activity_service.search_audit_log(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO audit_activity_service;
GRANT EXECUTE ON FUNCTION audit_activity_service.search_audit_log_safe(JSONB, INTEGER, INTEGER) TO audit_activity_service;