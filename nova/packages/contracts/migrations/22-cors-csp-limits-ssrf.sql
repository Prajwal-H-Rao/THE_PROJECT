-- Migration 22: CORS, CSP, body/file limits, SSRF guard
-- Branch: 22
-- Adds CORS allow-list, CSP, body and file limits, SSRF guard (Task 13).
-- Each control has a test.

CREATE TABLE identity_service.cors_policies (
    policy_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL UNIQUE,
    allowed_origins   TEXT[] NOT NULL DEFAULT '{}',
    allowed_methods   TEXT[] NOT NULL DEFAULT ARRAY['GET', 'POST', 'OPTIONS'],
    allowed_headers   TEXT[] NOT NULL DEFAULT ARRAY['Content-Type', 'Authorization'],
    exposed_headers   TEXT[] NOT NULL DEFAULT ARRAY['Content-Length'],
    allow_credentials BOOLEAN NOT NULL DEFAULT true,
    max_age_seconds   INTEGER NOT NULL DEFAULT 86400,
    active            BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION identity_service;

CREATE TABLE identity_service.csp_policies (
    policy_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL UNIQUE,
    directives        JSONB NOT NULL, -- CSP directives as JSON
    report_only       BOOLEAN NOT NULL DEFAULT false,
    active            BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION identity_service;

CREATE TABLE identity_service.body_limits (
    limit_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_pattern  TEXT NOT NULL, -- regex pattern for endpoint
    max_body_bytes    BIGINT NOT NULL DEFAULT 1048576, -- 1 MiB default
    max_file_bytes    BIGINT NOT NULL DEFAULT 10485760, -- 10 MiB default
    allowed_mime_types TEXT[] DEFAULT '{}',
    active            BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION identity_service;

CREATE TABLE identity_service.ssrf_guard_rules (
    rule_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL UNIQUE,
    description       TEXT,
    blocked_ranges    CIDR[] NOT NULL DEFAULT ARRAY[
        '10.0.0.0/8'::CIDR,
        '172.16.0.0/12'::CIDR,
        '192.168.0.0/16'::CIDR,
        '127.0.0.0/8'::CIDR,
        '169.254.0.0/16'::CIDR,
        '::1/128'::CIDR,
        'fc00::/7'::CIDR
    ],
    allowed_ports     INTEGER[] DEFAULT '{}',
    blocked_ports     INTEGER[] DEFAULT '{22,23,25,110,143,993,995,1723,3306,5432,6379,8080,8443,27017}',
    allow_loopback    BOOLEAN NOT NULL DEFAULT false,
    allow_private     BOOLEAN NOT NULL DEFAULT false,
    active            BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION identity_service;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to check if an IP is allowed by SSRF guard
CREATE OR REPLACE FUNCTION identity_service.check_ssrf_guard(
    p_ip INET,
    p_port INTEGER DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_rule RECORD;
    v_allowed BOOLEAN := true;
BEGIN
    FOR v_rule IN SELECT * FROM identity_service.ssrf_guard_rules WHERE active = true LOOP
        -- Check if IP is in blocked ranges
        IF p_ip << ANY(v_rule.blocked_ranges) THEN
            IF NOT v_rule.allow_loopback AND p_ip << '127.0.0.0/8'::CIDR THEN
                v_allowed := false;
            ELSIF NOT v_rule.allow_private AND (
                p_ip << '10.0.0.0/8'::CIDR OR
                p_ip << '172.16.0.0/12'::CIDR OR
                p_ip << '192.168.0.0/16'::CIDR OR
                p_ip << 'fc00::/7'::CIDR
            ) THEN
                v_allowed := false;
            ELSE
                v_allowed := false;
            END IF;
        END IF;

        -- Check port restrictions
        IF p_port IS NOT NULL THEN
            IF p_port = ANY(v_rule.blocked_ports) THEN
                v_allowed := false;
            END IF;
            IF array_length(v_rule.allowed_ports, 1) > 0 AND NOT (p_port = ANY(v_rule.allowed_ports)) THEN
                v_allowed := false;
            END IF;
        END IF;

        IF NOT v_allowed THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN v_allowed;
END;
$$ LANGUAGE plpgsql;

-- Function to get active CORS policy
CREATE OR REPLACE FUNCTION identity_service.get_cors_policy(
    p_origin TEXT
) RETURNS RECORD LANGUAGE plpgsql AS $$
DECLARE
    v_policy RECORD;
BEGIN
    SELECT * INTO v_policy
    FROM identity_service.cors_policies
    WHERE active = true
      AND (p_origin = ANY(allowed_origins) OR '*' = ANY(allowed_origins))
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN v_policy;
END;
$$ LANGUAGE plpgsql;

-- Function to get CSP header value
CREATE OR REPLACE FUNCTION identity_service.get_csp_header()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_policy RECORD;
    v_header TEXT;
BEGIN
    SELECT * INTO v_policy
    FROM identity_service.csp_policies
    WHERE active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_policy IS NULL THEN
        RETURN '';
    END IF;

    v_header := '';
    FOR key, value IN SELECT * FROM jsonb_each_text(v_policy.directives) LOOP
        v_header := v_header || key || ' ' || value || '; ';
    END LOOP;

    RETURN v_header;
END;
$$ LANGUAGE plpgsql;

-- Function to check body limit
CREATE OR REPLACE FUNCTION identity_service.check_body_limit(
    p_endpoint TEXT,
    p_content_length BIGINT,
    p_mime_type TEXT DEFAULT NULL
) RETURNS TABLE (allowed BOOLEAN, reason TEXT) LANGUAGE plpgsql AS $$
DECLARE
    v_limit RECORD;
BEGIN
    SELECT * INTO v_limit
    FROM identity_service.body_limits
    WHERE active = true
      AND p_endpoint ~ endpoint_pattern
    ORDER BY max_body_bytes ASC
    LIMIT 1;

    IF v_limit IS NULL THEN
        RETURN QUERY SELECT true, 'No limit configured';
    END IF;

    IF p_content_length > v_limit.max_body_bytes THEN
        RETURN QUERY SELECT false, 'Body exceeds maximum size of ' || v_limit.max_body_bytes || ' bytes';
    END IF;

    IF p_mime_type IS NOT NULL AND array_length(v_limit.allowed_mime_types, 1) > 0 THEN
        IF NOT (p_mime_type = ANY(v_limit.allowed_mime_types)) THEN
            RETURN QUERY SELECT false, 'MIME type not allowed';
        END IF;
    END IF;

    RETURN QUERY SELECT true, 'OK';
END;
$$ LANGUAGE plpgsql;

-- Function to check file upload limit
CREATE OR REPLACE FUNCTION identity_service.check_file_limit(
    p_file_size BIGINT,
    p_mime_type TEXT
) RETURNS TABLE (allowed BOOLEAN, reason TEXT) LANGUAGE plpgsql AS $$
DECLARE
    v_limit RECORD;
BEGIN
    SELECT * INTO v_limit
    FROM identity_service.body_limits
    WHERE active = true
      AND max_file_bytes > 0
    ORDER BY max_file_bytes ASC
    LIMIT 1;

    IF v_limit IS NULL THEN
        RETURN QUERY SELECT true, 'No file limit configured';
    END IF;

    IF p_file_size > v_limit.max_file_bytes THEN
        RETURN QUERY SELECT false, 'File exceeds maximum size of ' || v_limit.max_file_bytes || ' bytes';
    END IF;

    IF array_length(v_limit.allowed_mime_types, 1) > 0 THEN
        IF NOT (p_mime_type = ANY(v_limit.allowed_mime_types)) THEN
            RETURN QUERY SELECT false, 'File type not allowed';
        END IF;
    END IF;

    RETURN QUERY SELECT true, 'OK';
END;
$$ LANGUAGE plpgsql;

-- Insert default SSRF guard rule
INSERT INTO identity_service.ssrf_guard_rules (name, description)
VALUES ('default', 'Default SSRF guard blocking private and loopback addresses')
ON CONFLICT (name) DO NOTHING;

-- Insert default CORS policy
INSERT INTO identity_service.cors_policies (name, allowed_origins, allowed_methods, allowed_headers, exposed_headers, allow_credentials, max_age_seconds)
VALUES ('default', ARRAY['http://localhost:3000', 'https://nova.local'], 
    ARRAY['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    ARRAY['Content-Type', 'Authorization', 'X-CSRF-Token'],
    ARRAY['Content-Length'],
    true, 86400)
ON CONFLICT (name) DO NOTHING;

-- Insert default CSP policy
INSERT INTO identity_service.csp_policies (name, directives, report_only)
VALUES ('default', 
    '{"default-src": ["\'self\'"], "script-src": ["\'self\'", "\'unsafe-inline\'"], "style-src": ["\'self\'", "\'unsafe-inline\'"], "img-src": ["\'self\'", "data:", "https:"], "font-src": ["\'self\'", "https:"], "connect-src": ["\'self\'"], "frame-ancestors": ["\'none\'"]}',
    false)
ON CONFLICT (name) DO NOTHING;

-- Insert default body limits
INSERT INTO identity_service.body_limits (endpoint_pattern, max_body_bytes, max_file_bytes, allowed_mime_types)
VALUES 
    ('^/api/.*', 1048576, 10485760, ARRAY['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data']),
    ('^/auth/.*', 1048576, 1048576, ARRAY['application/json', 'application/x-www-form-urlencoded'])
ON CONFLICT DO NOTHING;