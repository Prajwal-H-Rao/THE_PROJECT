-- Migration 04: policy schema
-- Branch: 04
-- Creates approvals and policy_decisions tables in the policy_approval_service schema.
-- Approval binds to a payload hash (spec: approval binds to a payload hash).

CREATE TABLE policy_approval_service.approvals (
    approval_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    action            TEXT NOT NULL,
    resource_type     TEXT NOT NULL,
    resource_id       TEXT,
    payload_hash      CHAR(64) NOT NULL, -- SHA-256 of the payload the approval covers
    status            TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'expired', 'revoked'
    requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at        TIMESTAMPTZ,
    decided_by        UUID,
    expires_at        TIMESTAMPTZ,
    metadata          JSONB NOT NULL DEFAULT '{}'
) AUTHORIZATION policy_approval_service;

CREATE INDEX idx_approvals_user_id ON policy_approval_service.approvals (user_id);
CREATE INDEX idx_approvals_status ON policy_approval_service.approvals (status);
CREATE INDEX idx_approvals_expires_at ON policy_approval_service.approvals (expires_at);

CREATE TABLE policy_approval_service.policy_decisions (
    decision_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type        TEXT NOT NULL, -- 'user', 'service'
    actor_id          TEXT NOT NULL,
    action            TEXT NOT NULL,
    resource_type     TEXT NOT NULL,
    resource_id       TEXT,
    result            TEXT NOT NULL, -- 'allowed', 'denied', 'step_up'
    reason            TEXT,
    policy_version    TEXT NOT NULL,
    evaluated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload_hash      CHAR(64), -- SHA-256 of the evaluated payload
    metadata          JSONB NOT NULL DEFAULT '{}'
) AUTHORIZATION policy_approval_service;

CREATE INDEX idx_policy_decisions_actor ON policy_approval_service.policy_decisions (actor_type, actor_id);
CREATE INDEX idx_policy_decisions_action ON policy_approval_service.policy_decisions (action);
CREATE INDEX idx_policy_decisions_evaluated_at ON policy_approval_service.policy_decisions (evaluated_at);