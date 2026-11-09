/**
 * Nova design system - Finance service export & delete test (task 11.10, module 11).
 * Test-first: written before exportTransactions. Confirmed failing, then passing.
 * Verifies exportTransactions reads all transactions for a user and
 * deleteTransaction removes them (no-op if missing). Uses a mocked pg Pool.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { FinanceService } from "./finance-service.js";
import { FinanceTransactionRepository } from "./finance-repository.js";
import type { FinanceTransaction } from "./finance-entity.js";
import type { Pool } from "pg";

// Purpose: convert a domain Transaction to a DB row (snake_case) as pg would return.
function toRow(t: FinanceTransaction): Record<string, unknown> {
  return {
    transaction_id: t.transactionId,
    user_id: t.userId,
    source: t.source,
    source_reference: t.sourceReference,
    amount_minor: t.amountMinor,
    currency: t.currency,
    transaction_date: t.transactionDate,
    posted_at: t.postedAt,
    merchant: t.merchant,
    category: t.category,
    category_confidence: t.categoryConfidence,
    category_confidence_reason: t.categoryConfidenceReason,
    idempotency_key: t.idempotencyKey,
    raw_json: t.rawJson,
    created_at: t.createdAt,
  };
}

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
// rows: the domain transactions stored in the mock database.
function makeService(rows: FinanceTransaction[]): FinanceService {
  const dbRows = rows.map(toRow);
  const pool = {
    query: async (_text: string, values?: unknown[]): Promise<unknown> => {
      const [firstVal, secondVal] = values ?? [];
      if (_text.includes("idempotency_key = $1")) {
        return { rows: [], rowCount: 0 };
      }
      if (_text.includes("WHERE transaction_id = $1 AND user_id = $2")) {
        // DELETE: values = [transactionId, userId]
        const index = dbRows.findIndex(
          (r) => r.transaction_id === firstVal && r.user_id === secondVal,
        );
        if (index !== -1) {
          dbRows.splice(index, 1);
          return { rows: [{ transaction_id: firstVal }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
      // LIST / EXPORT: values = [userId]
      const userId = firstVal;
      const filtered = dbRows.filter((r) => r.user_id === userId);
      return { rows: filtered, rowCount: filtered.length };
    },
  } as unknown as Pool;
  const repository = new FinanceTransactionRepository(pool);
  return new FinanceService(repository);
}

describe("FinanceService export & delete", () => {
  it("exportTransactions returns all transactions for a user", async () => {
    const service = makeService([existingTransaction]);
    const result = await service.exportTransactions("user-1");
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.transactionId, "txn-existing");
    assert.strictEqual(result[0]!.amountMinor, 123456);
  });

  it("exportTransactions returns empty array when user has no transactions", async () => {
    const service = makeService([]);
    const result = await service.exportTransactions("user-1");
    assert.strictEqual(result.length, 0);
  });

  it("deleteTransaction returns true and removes the transaction", async () => {
    const service = makeService([existingTransaction]);
    const result = await service.deleteTransaction("user-1", "txn-existing");
    assert.strictEqual(result, true);
  });

  it("deleteTransaction returns false when transaction does not exist", async () => {
    const service = makeService([existingTransaction]);
    const result = await service.deleteTransaction("user-1", "txn-missing");
    assert.strictEqual(result, false);
  });

  it("deleteTransaction removes the transaction so it no longer appears in export", async () => {
    const service = makeService([existingTransaction]);
    const before = await service.exportTransactions("user-1");
    assert.strictEqual(before.length, 1);
    await service.deleteTransaction("user-1", "txn-existing");
    const after = await service.exportTransactions("user-1");
    assert.strictEqual(after.length, 0);
  });
});
