-- Migration 24: approval grant binding
-- Branch: 24
-- Task 4 of Module 08. Binds the approval to payload hash, user, target, expiry
-- and nonce (spec:778). Extends the approvals table from migration 04.
-- consumed_at and revoked_at are the authoritative single-use state; the
-- status column mirrors them. Task 5 consumes with a conditional update.

ALTER TABLE policy_approval_service.approvals
    ADD COLUMN nonce TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text;
-- WHY: the grants service mints its own 32-char hex nonce per grant. This
-- DEFAULT only fills legacy rows; it is NOT the minted format.

ALTER TABLE policy_approval_service.approvals
    ADD COLUMN service TEXT NOT NULL DEFAULT '';
-- WHY: a grant issued for one service must fail verification for another.

ALTER TABLE policy_approval_service.approvals
    ADD COLUMN policy_version TEXT NOT NULL DEFAULT '1';
-- WHY: a policy change invalidates old grants (task 13 pins the version here).

ALTER TABLE policy_approval_service.approvals
    ADD COLUMN consumed_at TIMESTAMPTZ;

ALTER TABLE policy_approval_service.approvals
    ADD COLUMN revoked_at TIMESTAMPTZ;

COMMENT ON COLUMN policy_approval_service.approvals.nonce IS
    '32-char hex nonce minted by the policy-approval-service grants module; the 36-char dashed UUID default only fills legacy rows.';
