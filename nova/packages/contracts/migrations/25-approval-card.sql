-- Migration 25: approval card API
-- Branch: 25
-- Task 8 of Module 08. Adds approval card data to the approvals table.
-- preview: the exact payload shown to user for approval (bounded, max 10KB)
-- card_hash: SHA-256 hex of canonical preview (separate from payload_hash)
-- permissions: allowed actions from policy rule (fallback: [action])
-- consequence: risk description from riskTier + sensitivity mapping
-- rule_id: PolicyRule.id string that matched

ALTER TABLE policy_approval_service.approvals
    ADD COLUMN preview JSONB;
COMMENT ON COLUMN policy_approval_service.approvals.preview IS
    'Exact payload object shown to user for approval. Bounded to 10KB max.';

ALTER TABLE policy_approval_service.approvals
    ADD COLUMN card_hash CHAR(64);
COMMENT ON COLUMN policy_approval_service.approvals.card_hash IS
    'SHA-256 hex of canonical preview (computeApprovalHash(preview)).';

ALTER TABLE policy_approval_service.approvals
    ADD COLUMN permissions JSONB;
COMMENT ON COLUMN policy_approval_service.approvals.permissions IS
    'Allowed actions from policy rule (rule.allowedActions ?? [action]).';

ALTER TABLE policy_approval_service.approvals
    ADD COLUMN consequence TEXT;
COMMENT ON COLUMN policy_approval_service.approvals.consequence IS
    'Risk description from riskTier + sensitivity mapping table.';

ALTER TABLE policy_approval_service.approvals
    ADD COLUMN rule_id TEXT;
COMMENT ON COLUMN policy_approval_service.approvals.rule_id IS
    'PolicyRule.id string that matched the decision.';