/**
 * Nova design system - Migration 34: finance_transactions table.
 * Creates finance_transactions table in finance_service schema for
 * finance import and reconciliation. Each row is content-addressed
 * via idempotency_key for deduplication.
 */

CREATE TABLE finance_service.finance_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source VARCHAR(32) NOT NULL,
  source_reference TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  transaction_date TIMESTAMPTZ NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  merchant TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'uncategorized',
  category_confidence REAL DEFAULT 0,
  category_confidence_reason TEXT,
  idempotency_key TEXT NOT NULL,
  raw_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
) AUTHORIZATION finance_service;

CREATE INDEX idx_finance_transactions_user_id ON finance_service.finance_transactions (user_id);
CREATE INDEX idx_finance_transactions_idempotency_key ON finance_service.finance_transactions (idempotency_key);
CREATE INDEX idx_finance_transactions_user_date ON finance_service.finance_transactions (user_id, transaction_date);

COMMENT ON COLUMN finance_service.finance_transactions.amount_minor IS 'Amount in minor currency units (cents)';
COMMENT ON COLUMN finance_service.finance_transactions.currency IS 'ISO 4217 currency code';
COMMENT ON COLUMN finance_service.finance_transactions.idempotency_key IS 'Content-addressed key for dedup: user_id + source + source_reference hash';
