/**
 * Nova design system - Finance repository.
 * SQL queries against finance_service.finance_transactions table.
 * Provides CRUD operations for finance transactions with ownership enforcement.
 * Uses pg Pool for database connections.
 */

import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import type {
  FinanceTransaction,
  CreateFinanceTransactionInput,
  FinanceTransactionListFilter,
} from "./finance-entity.js";

const FINANCE_TRANSACTIONS_TABLE = "finance_service.finance_transactions";

@Injectable()
export class FinanceTransactionRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async create(userId: string, input: CreateFinanceTransactionInput): Promise<FinanceTransaction> {
    const query = `
      INSERT INTO ${FINANCE_TRANSACTIONS_TABLE}
        (user_id, source, source_reference, amount_minor, currency,
         transaction_date, posted_at, merchant, category,
         category_confidence, category_confidence_reason, idempotency_key,
         raw_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING transaction_id, user_id, source, source_reference, amount_minor,
                currency, transaction_date, posted_at, merchant, category,
                category_confidence, category_confidence_reason, idempotency_key,
                raw_json, created_at
    `;
    const values = [
      userId,
      input.source,
      input.sourceReference,
      input.amountMinor,
      input.currency,
      input.transactionDate,
      input.postedAt ?? input.transactionDate,
      input.merchant,
      input.category,
      input.categoryConfidence ?? 0,
      input.categoryConfidenceReason ?? null,
      input.idempotencyKey,
      JSON.stringify(input.rawJson),
    ];
    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async findById(userId: string, transactionId: string): Promise<FinanceTransaction | null> {
    const query = `
      SELECT transaction_id, user_id, source, source_reference, amount_minor,
             currency, transaction_date, posted_at, merchant, category,
             category_confidence, category_confidence_reason, idempotency_key,
             raw_json, created_at
      FROM ${FINANCE_TRANSACTIONS_TABLE}
      WHERE transaction_id = $1 AND user_id = $2
    `;
    const result = await this.pool.query(query, [transactionId, userId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async list(userId: string, filter?: FinanceTransactionListFilter): Promise<FinanceTransaction[]> {
    let query = `
      SELECT transaction_id, user_id, source, source_reference, amount_minor,
             currency, transaction_date, posted_at, merchant, category,
             category_confidence, category_confidence_reason, idempotency_key,
             raw_json, created_at
      FROM ${FINANCE_TRANSACTIONS_TABLE}
      WHERE user_id = $1
    `;
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (filter?.category) {
      query += ` AND category = $${paramIndex}`;
      values.push(filter.category);
      paramIndex++;
    }
    if (filter?.startDate) {
      query += ` AND transaction_date >= $${paramIndex}`;
      values.push(filter.startDate);
      paramIndex++;
    }
    if (filter?.endDate) {
      query += ` AND transaction_date <= $${paramIndex}`;
      values.push(filter.endDate);
      paramIndex++;
    }

    query += " ORDER BY transaction_date DESC";
    const result = await this.pool.query(query, values);
    return result.rows.map((row) => this.mapRow(row));
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    const query = `
      DELETE FROM ${FINANCE_TRANSACTIONS_TABLE}
      WHERE transaction_id = $1 AND user_id = $2
      RETURNING transaction_id
    `;
    const result = await this.pool.query(query, [transactionId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: unknown): FinanceTransaction {
    const r = row as Record<string, unknown>;
    return {
      transactionId: String(r.transaction_id),
      userId: String(r.user_id),
      source: String(r.source),
      sourceReference: String(r.source_reference),
      amountMinor: Number(r.amount_minor),
      currency: String(r.currency),
      transactionDate: String(r.transaction_date),
      postedAt: String(r.posted_at),
      merchant: String(r.merchant),
      category: String(r.category),
      categoryConfidence: Number(r.category_confidence ?? 0),
      categoryConfidenceReason: r.category_confidence_reason === null ? null : String(r.category_confidence_reason),
      idempotencyKey: String(r.idempotency_key),
      rawJson: typeof r.raw_json === "string" ? JSON.parse(r.raw_json) : (r.raw_json as Record<string, unknown>),
      createdAt: String(r.created_at),
    };
  }
}
