-- Migration 17: resource ownership base layer
-- Branch: 17
-- Implements the resource-ownership check in the repository base layer (Task 7).
-- Every service created later extends it. Cross-user read fails.

-- Base function to check resource ownership
-- Services should call this in their repository layer before any read/write
CREATE OR REPLACE FUNCTION identity_service.check_resource_ownership(
    p_user_id UUID,
    p_resource_table TEXT, -- table name in the service's schema
    p_resource_id UUID,
    p_owner_column TEXT DEFAULT 'user_id'
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sql TEXT;
    v_result BOOLEAN;
BEGIN
    -- Construct dynamic SQL to check ownership
    v_sql := format(
        'SELECT EXISTS (SELECT 1 FROM %I WHERE %I = $1 AND %I = $2)',
        p_resource_table, p_owner_column, 'id' -- assumes primary key is 'id'
    );
    
    EXECUTE v_sql INTO v_result USING p_resource_id, p_user_id;
    RETURN v_result;
END;
$$;

-- Generic ownership check for any table with user_id column
CREATE OR REPLACE FUNCTION identity_service.check_ownership(
    p_user_id UUID,
    p_schema_name TEXT,
    p_table_name TEXT,
    p_resource_id UUID,
    p_owner_column TEXT DEFAULT 'user_id'
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_sql TEXT;
    v_result BOOLEAN;
BEGIN
    v_sql := format(
        'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE %I = $1 AND %I = $2)',
        p_schema_name, p_table_name, p_owner_column, 'id'
    );
    
    EXECUTE v_sql INTO v_result USING p_resource_id, p_user_id;
    RETURN v_result;
END;
$$;

-- Function to enforce ownership in a policy (used by policy service)
CREATE OR REPLACE FUNCTION identity_service.enforce_ownership(
    p_user_id UUID,
    p_schema_name TEXT,
    p_table_name TEXT,
    p_resource_id UUID,
    p_owner_column TEXT DEFAULT 'user_id'
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT identity_service.check_ownership(p_user_id, p_schema_name, p_table_name, p_resource_id, p_owner_column) THEN
        RAISE EXCEPTION 'Access denied: user % does not own resource % in %.%',
            p_user_id, p_resource_id, p_schema_name, p_table_name
        USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$;

-- View to show all tables with user_id column (for auditing)
CREATE OR REPLACE VIEW identity_service.tables_with_user_id AS
SELECT 
    n.nspname AS schema_name,
    c.relname AS table_name,
    a.attname AS owner_column
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE a.attname = 'user_id'
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname LIKE '%_service'
  AND c.relkind = 'r'
ORDER BY n.nspname, c.relname;

GRANT SELECT ON identity_service.tables_with_user_id TO identity_service;