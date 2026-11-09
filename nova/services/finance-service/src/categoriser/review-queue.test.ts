/**
 * Nova design system - Ambiguous-import review queue test (task 11.8, module 11).
 * Test-first: written before review-queue.ts. Confirmed failing, then passing.
 * Queue surfaces only uncertain rows (low confidence / model-drafted);
 * confirmed rows are excluded. Deterministic ordering, add + retrieve + resolve.
 * Deterministic output (same queue state -> same result); no pg, no credentials;
 * categorize only, no movement of money.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { ReviewQueue } from "./review-queue.js";

function row(overrides: Partial<ReviewRow> = {}): ReviewRow {
  return {
    transactionId: "txn-1",
    category: "uncategorised",
    confidence: 0.4,
    reason: "Low model confidence",
    ...overrides,
  };
}

interface ReviewRow {
  transactionId: string;
  category: string;
  confidence: number;
  reason: string;
}

describe("ReviewQueue", () => {
  it("enqueues and retrieves all pending rows", () => {
    const q = new ReviewQueue();
    q.enqueue(row({ transactionId: "txn-1", category: "uncategorised", confidence: 0.4 }));
    q.enqueue(row({ transactionId: "txn-2", category: "Food", confidence: 0.9 }));
    const queue = q.getQueue();
    assert.strictEqual(queue.length, 2);
    assert.strictEqual(queue[0]!.transactionId, "txn-1");
    assert.strictEqual(queue[1]!.transactionId, "txn-2");
  });

  it("getUncertainRows returns only rows below the threshold", () => {
    const q = new ReviewQueue();
    q.enqueue(row({ transactionId: "txn-1", confidence: 0.4 }));
    q.enqueue(row({ transactionId: "txn-2", confidence: 0.9 }));
    q.enqueue(row({ transactionId: "txn-3", confidence: 0.8 }));
    const uncertain = q.getUncertainRows(0.8);
    assert.strictEqual(uncertain.length, 1);
    assert.strictEqual(uncertain[0]!.transactionId, "txn-1");
  });

  it("boundary confidence equal to threshold is not uncertain", () => {
    const q = new ReviewQueue();
    q.enqueue(row({ transactionId: "txn-1", confidence: 0.8 }));
    assert.strictEqual(q.getUncertainRows(0.8).length, 0);
  });

  it("resolve removes a row from the queue", () => {
    const q = new ReviewQueue();
    q.enqueue(row({ transactionId: "txn-1", confidence: 0.4 }));
    q.enqueue(row({ transactionId: "txn-2", confidence: 0.3 }));
    q.resolve("txn-1", "Food");
    const queue = q.getQueue();
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0]!.transactionId, "txn-2");
  });

  it("resolve on a missing transaction is a no-op", () => {
    const q = new ReviewQueue();
    q.enqueue(row({ transactionId: "txn-1", confidence: 0.4 }));
    q.resolve("txn-missing", "Food");
    assert.strictEqual(q.getQueue().length, 1);
  });

  it("is deterministic: same queue state -> same output", () => {
    const q1 = new ReviewQueue();
    q1.enqueue(row({ transactionId: "txn-1", confidence: 0.4 }));
    q1.enqueue(row({ transactionId: "txn-2", confidence: 0.3 }));
    const q2 = new ReviewQueue();
    q2.enqueue(row({ transactionId: "txn-1", confidence: 0.4 }));
    q2.enqueue(row({ transactionId: "txn-2", confidence: 0.3 }));
    assert.deepStrictEqual(q1.getUncertainRows(0.8), q2.getUncertainRows(0.8));
    assert.deepStrictEqual(q1.getQueue(), q2.getQueue());
  });

  it("empty queue returns no uncertain rows", () => {
    const q = new ReviewQueue();
    assert.strictEqual(q.getUncertainRows(0.8).length, 0);
    assert.strictEqual(q.getQueue().length, 0);
  });
});
