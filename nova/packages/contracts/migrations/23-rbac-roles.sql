-- Migration 23: RBAC roles
-- Branch: 23
-- Implements RBAC roles admin, user, viewer (Task 17).
-- A user role is denied on an admin-classified tool call (spec:237).

CREATE TYPE identity_service.role_type AS ENUM ('admin', 'user', 'viewer');

CREATE TABLE identity_service.user_roles (
    role_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES identity_service.users (user_id) ON DELETE CASCADE,
    role          identity_service.role_type NOT NULL DEFAULT 'user',
    granted_by    UUID REFERENCES identity_service.users (user_id),
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at    TIMESTAMPTZ,
    UNIQUE (user_id, role)
) AUTHORIZATION identity_service;

CREATE INDEX idx_user_roles_user_id ON identity_service.user_roles (user_id);
CREATE INDEX idx_user_roles_role ON identity_service.user_roles (role);

-- Function to grant a role to a user
CREATE OR REPLACE FUNCTION identity_service.grant_role(
    p_user_id UUID,
    p_role identity_service.role_type,
    p_granted_by UUID
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Prevent self-granting of admin role
    IF p_role = 'admin' AND p_user_id = p_granted_by THEN
        RAISE EXCEPTION 'Cannot self-grant admin role';
    END IF;

    -- Only admins can grant admin role
    IF p_role = 'admin' THEN
        IF NOT identity_service.user_has_role(p_granted_by, 'admin') THEN
            RAISE EXCEPTION 'Only admins can grant admin role';
        END IF;
    END IF;

    INSERT INTO identity_service.user_roles (user_id, role, granted_by)
    VALUES (p_user_id, p_role, p_granted_by)
    ON CONFLICT (user_id, role) DO UPDATE SET
        revoked_at = NULL,
        granted_at = now(),
        granted_by = EXCLUDED.granted_by
    RETURNING role_id INTO v_role_id;

    RETURN v_role_id;
END;
$$ LANGUAGE plpgsql;

-- Function to revoke a role from a user
CREATE OR REPLACE FUNCTION identity_service.revoke_role(
    p_user_id UUID,
    p_role identity_service.role_type
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    UPDATE identity_service.user_roles
    SET revoked_at = now()
    WHERE user_id = p_user_id
      AND role = p_role
      AND revoked_at IS NULL;
    RETURN FOUND;
END;
$$;

-- Function to check if user has a role
CREATE OR REPLACE FUNCTION identity_service.user_has_role(
    p_user_id UUID,
    p_role identity_service.role_type
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM identity_service.user_roles
        WHERE user_id = p_user_id
          AND role = p_role
          AND revoked_at IS NULL
    );
END;
$$;

-- Function to get all active roles for a user
CREATE OR REPLACE FUNCTION identity_service.get_user_roles(
    p_user_id UUID
) RETURNS SETOF identity_service.user_roles LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM identity_service.user_roles
    WHERE user_id = p_user_id AND revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has admin role
CREATE OR REPLACE FUNCTION identity_service.is_admin(
    p_user_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    RETURN identity_service.user_has_role(p_user_id, 'admin');
END;
$$;

-- Function to check if user has viewer role
CREATE OR REPLACE FUNCTION identity_service.is_viewer(
    p_user_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    RETURN identity_service.user_has_role(p_user_id, 'viewer');
END;
$$;

-- Default role assignment on user creation
CREATE OR REPLACE FUNCTION identity_service.assign_default_role()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO identity_service.user_roles (user_id, role, granted_by)
    VALUES (NEW.user_id, 'user', NEW.user_id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign default role on user creation
DROP TRIGGER IF EXISTS trigger_assign_default_role ON identity_service.users;
CREATE TRIGGER trigger_assign_default_role
AFTER INSERT ON identity_service.users
FOR EACH ROW EXECUTE FUNCTION identity_service.assign_default_role();

-- View for user roles with grantor info
CREATE OR REPLACE VIEW identity_service.user_roles_detailed AS
SELECT 
    ur.user_id,
    u.email,
    ur.role,
    ur.granted_at,
    ur.revoked_at,
    g.email AS granted_by_email
FROM identity_service.user_roles ur
JOIN identity_service.users u ON ur.user_id = u.user_id
LEFT JOIN identity_service.users g ON ur.granted_by = g.user_id
WHERE ur.revoked_at IS NULL;

GRANT SELECT ON identity_service.user_roles_detailed TO identity_service;
