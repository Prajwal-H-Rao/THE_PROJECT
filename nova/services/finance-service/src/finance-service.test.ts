/**
 * Nova design system - Finance service dedup test (task 11.4, module 11).
 * Verifies createTransaction short-circuits on an existing idempotency key
 * so re-importing the same statement is a no-op. Uses a mocked pg Pool
 * (no live database).
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { FinanceService } from "./finance-service.js";
import { FinanceTransactionRepository } from "./finance-repository.js";
import type { FinanceTransaction, CreateFinanceTransactionInput } from "./finance-entity.js";
import type { Pool } from "pg";

const existingTransaction: FinanceTransaction = {
  transactionId: "txn-existing",
  userId: "user-1",
  source: "pdf-statement",
  sourceReference: "ref-1",
  amountMinor: 123456,
  currency: "USD",
  transactionDate: "2026-11-05",
  postedAt: "2026-11-05T00:00:00Z",
  merchant: "Grocery Store",
  category: "uncategorised",
  categoryConfidence: 0,
  categoryConfidenceReason: null,
  idempotencyKey: "finance:user-1:abc123",
  rawJson: {},
  createdAt: "2026-11-05T00:00:00Z",
};

// Purpose: build a FinanceService backed by a mocked pg Pool.
// `existing` is the row returned by findByIdempotencyKey (null = no existing).
// Rows use snake_case column names as pg would return.
function makeService(existing: FinanceTransaction | null): FinanceService {
  const existingRow = existing
    ? {
        transaction_id: existing.transactionId,
        user_id: existing.userId,
        source: existing.source,
        source_reference: existing.sourceReference,
        amount_minor: existing.amountMinor,
        currency: existing.currency,
        transaction_date: existing.transactionDate,
        posted_at: existing.postedAt,
        merchant: existing.merchant,
        category: existing.category,
        category_confidence: existing.categoryConfidence,
        category_confidence_reason: existing.categoryConfidenceReason,
        idempotency_key: existing.idempotencyKey,
        raw_json: existing.rawJson,
        created_at: existing.createdAt,
      }
    : null;
  const pool = {
    query: async (text: string): Promise<unknown> => {
      if (text.includes("idempotency_key = $1")) {
        return { rows: existingRow ? [existingRow] : [], rowCount: existingRow ? 1 : 0 };
      }
      // INSERT (repository.create) returns the inserted row.
      return {
        rows: [
          {
            transaction_id: existingRow?.transaction_id ?? "txn-new",
            user_id: existingRow?.user_id ?? "user-1",
            source: existingRow?.source ?? "pdf-statement",
            source_reference: existingRow?.source_reference ?? "ref-new",
            amount_minor: existingRow?.amount_minor ?? 99999,
            currency: existingRow?.currency ?? "USD",
            transaction_date: existingRow?.transaction_date ?? "2026-11-06",
            posted_at: existingRow?.posted_at ?? "2026-11-06T00:00:00Z",
            merchant: existingRow?.merchant ?? "New Shop",
            category: existingRow?.category ?? "uncategorised",
            category_confidence: existingRow?.category_confidence ?? 0,
            category_confidence_reason: null,
            idempotency_key: existingRow?.idempotency_key ?? "finance:user-1:newkey",
            raw_json: existingRow?.raw_json ?? {},
            created_at: existingRow?.created_at ?? "2026-11-06T00:00:00Z",
          },
        ],
        rowCount: 1,
      };
    },
  } as unknown as Pool;
  const repository = new FinanceTransactionRepository(pool);
  return new FinanceService(repository);
}

describe("FinanceService dedup", () => {
  it("createTransaction returns existing without inserting when key exists", async () => {
    let insertCalled = false;
    const existingRow = {
      transaction_id: existingTransaction.transactionId,
      user_id: existingTransaction.userId,
      source: existingTransaction.source,
      source_reference: existingTransaction.sourceReference,
      amount_minor: existingTransaction.amountMinor,
      currency: existingTransaction.currency,
      transaction_date: existingTransaction.transactionDate,
      posted_at: existingTransaction.postedAt,
      merchant: existingTransaction.merchant,
      category: existingTransaction.category,
      category_confidence: existingTransaction.categoryConfidence,
      category_confidence_reason: existingTransaction.categoryConfidenceReason,
      idempotency_key: existingTransaction.idempotencyKey,
      raw_json: existingTransaction.rawJson,
      created_at: existingTransaction.createdAt,
    };
    const pool = {
      query: async (text: string): Promise<unknown> => {
        if (text.includes("idempotency_key = $1")) {
          return { rows: [existingRow], rowCount: 1 };
        }
        insertCalled = true;
        return { rows: [], rowCount: 0 };
      },
    } as unknown as Pool;
    const repository = new FinanceTransactionRepository(pool);
    const service = new FinanceService(repository);

    const input: CreateFinanceTransactionInput = {
      userId: "user-1",
      source: "pdf-statement",
      sourceReference: "ref-1",
      amountMinor: 123456,
      currency: "USD",
      transactionDate: "2026-11-05",
      merchant: "Grocery Store",
      category: "uncategorised",
      idempotencyKey: "finance:user-1:abc123",
      rawJson: {},
    };

    const result = await service.createTransaction("user-1", input);
    assert.strictEqual(result.transactionId, "txn-existing");
    assert.strictEqual(result.amountMinor, 123456);
    assert.ok(!insertCalled, "INSERT must not be called for an existing idempotency key");
  });

  it("createTransaction inserts when no existing key", async () => {
    const service = makeService(null);

    const input: CreateFinanceTransactionInput = {
      userId: "user-1",
      source: "pdf-statement",
      sourceReference: "ref-new",
      amountMinor: 99999,
      currency: "USD",
      transactionDate: "2026-11-06",
      merchant: "New Shop",
      category: "uncategorised",
      idempotencyKey: "finance:user-1:newkey",
      rawJson: {},
    };

    const result = await service.createTransaction("user-1", input);
    assert.strictEqual(result.transactionId, "txn-new");
    assert.strictEqual(result.amountMinor, 99999);
  });
});
