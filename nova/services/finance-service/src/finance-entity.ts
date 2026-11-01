/**
 * Nova design system - Finance transaction entity.
 * Represents one user-owned financial transaction.
 */

export interface FinanceTransaction {
  readonly transactionId: string;
  readonly userId: string;
  readonly source: string;
  readonly sourceReference: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly transactionDate: string;
  readonly postedAt: string;
  readonly merchant: string;
  readonly category: string;
  readonly categoryConfidence: number;
  readonly categoryConfidenceReason: string | null;
  readonly idempotencyKey: string;
  readonly rawJson: Record<string, unknown>;
  readonly createdAt: string;
}

export interface CreateFinanceTransactionInput {
  readonly userId: string;
  readonly source: string;
  readonly sourceReference: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly transactionDate: string;
  readonly postedAt?: string;
  readonly merchant: string;
  readonly category: string;
  readonly categoryConfidence?: number;
  readonly categoryConfidenceReason?: string | null;
  readonly idempotencyKey: string;
  readonly rawJson: Record<string, unknown>;
}

export interface FinanceTransactionListFilter {
  userId: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}
