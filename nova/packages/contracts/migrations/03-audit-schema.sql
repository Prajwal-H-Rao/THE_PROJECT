-- Migration 03: audit schema
-- Branch: 03
-- Creates the audit_log table with append-only permissions, execution_status,
-- verification_type columns, and a check constraint that succeeded requires evidence.
-- Implements hash chaining over audit rows (tamper evidence, not immutability).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE audit_activity_service.audit_log (
    audit_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_type        TEXT NOT NULL, -- 'user', 'service', 'system'
    actor_id          TEXT NOT NULL,
    action            TEXT NOT NULL,
    resource_type     TEXT NOT NULL,
    resource_id       TEXT,
    policy_result     TEXT, -- 'allowed', 'denied', 'step_up', 'error'
    execution_status  TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'compensated'
    verification_type TEXT NOT NULL DEFAULT 'none', -- 'none', 'signature', 'receipt', 'external', 'human'
    evidence_ref      TEXT, -- pointer to external evidence (object store, receipt, etc.)
    payload           JSONB NOT NULL DEFAULT '{}',
    previous_hash     CHAR(64), -- SHA-256 of the previous row's hash chain input
    row_hash          CHAR(64) NOT NULL -- SHA-256 of this row's hash chain input
) AUTHORIZATION audit_activity_service;

-- Indexes for audit search (task 16 will add more)
CREATE INDEX idx_audit_occurred_at ON audit_activity_service.audit_log (occurred_at);
CREATE INDEX idx_audit_actor ON audit_activity_service.audit_log (actor_type, actor_id);
CREATE INDEX idx_audit_action ON audit_activity_service.audit_log (action);
CREATE INDEX idx_audit_resource ON audit_activity_service.audit_log (resource_type, resource_id);
CREATE INDEX idx_audit_policy_result ON audit_activity_service.audit_log (policy_result);
CREATE INDEX idx_audit_execution_status ON audit_activity_service.audit_log (execution_status);

-- Append-only: revoke UPDATE and DELETE on the table from the owner role.
-- The role can still INSERT. This is enforced at the permission level.
REVOKE UPDATE, DELETE ON audit_activity_service.audit_log FROM audit_activity_service;

-- Check constraint: succeeded status requires verification_type != 'none'
-- This enforces spec:141 "Do not record a succeeded state until authoritative result evidence exists."
-- and spec:907 "Use append-only DB permissions; optionally hash-chain events."
ALTER TABLE audit_activity_service.audit_log
    ADD CONSTRAINT audit_log_succeeded_requires_evidence
    CHECK (
        execution_status <> 'succeeded'
        OR verification_type <> 'none'
    );

-- Function to compute the hash chain input for a row.
-- The chain input is: previous_hash || '|' || audit_id || '|' || occurred_at || '|' || actor_type || '|' || actor_id || '|' || action || '|' || resource_type || '|' || resource_id || '|' || policy_result || '|' || execution_status || '|' || verification_type || '|' || evidence_ref || '|' || payload
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
    p_payload JSONB
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
            p_payload::text,
            'sha256'
        ),
        'hex'
    )::CHAR(64);
$$;

-- Trigger to set row_hash on INSERT. The previous_hash is the row_hash of the
-- most recent row (by occurred_at, then audit_id).
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
        NEW.payload
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_log_set_hashes
BEFORE INSERT ON audit_activity_service.audit_log
FOR EACH ROW EXECUTE FUNCTION audit_activity_service.set_audit_hashes();

-- Function to verify the hash chain from a given point to the end.
-- Returns the first broken row's audit_id, or NULL if the chain is intact.
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
            v_row.payload
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