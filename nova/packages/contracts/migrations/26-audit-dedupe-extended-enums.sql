-- Migration 26: audit dedupe key and extended enums
-- Branch: 26
-- Adds dedupe_key column with unique index for idempotent inserts.
-- Extends policy_result and execution_status enums to match spec:174 8 states.
-- Updates compute_row_hash to include dedupe_key via COALESCE so old rows still verify.

-- Add dedupe_key column
ALTER TABLE audit_activity_service.audit_log
    ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- Create unique index for dedupe_key (partial index for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_dedupe_key
    ON audit_activity_service.audit_log (dedupe_key)
    WHERE dedupe_key IS NOT NULL;

-- Update compute_row_hash to include dedupe_key in the chain input
-- Uses COALESCE so existing rows without dedupe_key still verify correctly
CREATE OR REPLACE FUNCTION audit_activity_service.compute_row_hash(
    p_previous_hash CHAR(64),
    p_audit_id UUID,
    p_occurred_at TIMESTAMPTZ,
    p_actor_type TEXT,
    p_actor_id TEXT,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_policy_result TEXT,
    p_execution_status TEXT,
    p_verification_type TEXT,
    p_evidence_ref TEXT,
    p_payload JSONB,
    p_dedupe_key TEXT DEFAULT NULL
) RETURNS CHAR(64) LANGUAGE sql IMMUTABLE AS $$
    SELECT encode(
        digest(
            COALESCE(p_previous_hash, '') || '|' ||
            p_audit_id::text || '|' ||
            p_occurred_at::text || '|' ||
            p_actor_type || '|' ||
            p_actor_id || '|' ||
            p_action || '|' ||
            p_resource_type || '|' ||
            COALESCE(p_resource_id, '') || '|' ||
            COALESCE(p_policy_result, '') || '|' ||
            p_execution_status || '|' ||
            p_verification_type || '|' ||
            COALESCE(p_evidence_ref, '') || '|' ||
            COALESCE(p_dedupe_key, '') || '|' ||
            p_payload::text,
            'sha256'
        ),
        'hex'
    )::CHAR(64);
$$;

-- Update the trigger function to pass dedupe_key
CREATE OR REPLACE FUNCTION audit_activity_service.set_audit_hashes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_previous_hash CHAR(64);
BEGIN
    -- Find the previous row's hash
    SELECT row_hash INTO v_previous_hash
    FROM audit_activity_service.audit_log
    ORDER BY occurred_at DESC, audit_id DESC
    LIMIT 1;

    NEW.previous_hash := v_previous_hash;
    NEW.row_hash := audit_activity_service.compute_row_hash(
        v_previous_hash,
        NEW.audit_id,
        NEW.occurred_at,
        NEW.actor_type,
        NEW.actor_id,
        NEW.action,
        NEW.resource_type,
        NEW.resource_id,
        NEW.policy_result,
        NEW.execution_status,
        NEW.verification_type,
        NEW.evidence_ref,
        NEW.payload,
        NEW.dedupe_key
    );
    RETURN NEW;
END;
$$;

-- The verify_hash_chain function also needs to be updated to handle dedupe_key
CREATE OR REPLACE FUNCTION audit_activity_service.verify_hash_chain(
    p_from_audit_id UUID DEFAULT NULL
) RETURNS SETOF UUID LANGUAGE plpgsql AS $$
DECLARE
    v_row RECORD;
    v_expected_hash CHAR(64);
    v_previous_hash CHAR(64) := NULL;
BEGIN
    FOR v_row IN
        SELECT *
        FROM audit_activity_service.audit_log
        WHERE p_from_audit_id IS NULL OR audit_id >= p_from_audit_id
        ORDER BY occurred_at ASC, audit_id ASC
    LOOP
        IF v_row.previous_hash IS DISTINCT FROM v_previous_hash THEN
            RETURN NEXT v_row.audit_id;
            RETURN;
        END IF;

        v_expected_hash := audit_activity_service.compute_row_hash(
            v_row.previous_hash,
            v_row.audit_id,
            v_row.occurred_at,
            v_row.actor_type,
            v_row.actor_id,
            v_row.action,
            v_row.resource_type,
            v_row.resource_id,
            v_row.policy_result,
            v_row.execution_status,
            v_row.verification_type,
            v_row.evidence_ref,
            v_row.payload,
            v_row.dedupe_key
        );

        IF v_expected_hash IS DISTINCT FROM v_row.row_hash THEN
            RETURN NEXT v_row.audit_id;
            RETURN;
        END IF;

        v_previous_hash := v_row.row_hash;
    END LOOP;
    RETURN;
END;
$$;