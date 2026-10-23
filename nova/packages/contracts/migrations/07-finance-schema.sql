-- Migration 07: finance schema
-- Branch: 07
-- Creates finances table in the finance_service schema.
-- Object-storage pointers and retention policy (task 10).

CREATE TABLE finance_service.finances (
    finance_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    type              TEXT NOT NULL, -- 'expense', 'income', 'transfer', 'investment'
    amount            NUMERIC(19, 4) NOT NULL,
    currency          TEXT NOT NULL DEFAULT 'USD',
    category          TEXT NOT NULL,
    subcategory       TEXT,
    description       TEXT,
    occurred_at       TIMESTAMPTZ NOT NULL,
    account_id        UUID,
    counterparty      TEXT,
    receipt_ref       TEXT, -- pointer to object store for receipt PDF/image
    statement_ref     TEXT, -- pointer to object store for bank statement row
    metadata          JSONB NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION finance_service;

CREATE INDEX idx_finances_user_id ON finance_service.finances (user_id);
CREATE INDEX idx_finances_occurred_at ON finance_service.finances (occurred_at);
CREATE INDEX idx_finances_category ON finance_service.finances (category);
CREATE INDEX idx_finances_type ON finance_service.finances (type);

CREATE TABLE finance_service.retention_policies (
    policy_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type     TEXT NOT NULL, -- 'finances', 'notes', 'emails', 'events', 'trips'
    resource_id       UUID,
    retention_period  INTERVAL NOT NULL,
    legal_basis       TEXT NOT NULL, -- reference to docs/privacy-review.md
    review_date       DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (resource_type, resource_id)
) AUTHORIZATION finance_service;

CREATE INDEX idx_retention_resource ON finance_service.retention_policies (resource_type, resource_id);
CREATE INDEX idx_retention_review_date ON finance_service.retention_policies (review_date);