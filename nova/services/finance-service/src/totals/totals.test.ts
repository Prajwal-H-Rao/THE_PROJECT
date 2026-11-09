/**
 * Nova design system - Totals test (task 11.9, module 11).
 * Test-first: written before totals.ts. Confirmed failing, then passing.
 * Deterministic computation of totals, budget remaining and trends in
 * code. Integer minor units throughout; models summarize but are not the
 * source of truth.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  computeTotal,
  computeBudgetRemaining,
  computeTrend,
  type TotalsByPeriod,
} from "./totals.js";

function txn(
  amountMinor: number,
  date: string,
  category = "Food",
): Transaction {
  return { transactionId: "txn", userId: "u-1", source: "csv", amountMinor, currency: "USD", transactionDate: date, postedAt: date, merchant: "m", category, idempotencyKey: "k", rawJson: {} };
}

interface Transaction {
  transactionId: string;
  userId: string;
  source: string;
  amountMinor: number;
  currency: string;
  transactionDate: string;
  postedAt: string;
  merchant: string;
  category: string;
  idempotencyKey: string;
  rawJson: Record<string, unknown>;
}

describe("computeTotal", () => {
  it("sums integer minor units from a fixed fixture", () => {
    const fixture: Transaction[] = [
      txn(123456, "2026-11-01"),
      txn(7500, "2026-11-02"),
      txn(-20000, "2026-11-03"),
    ];
    assert.strictEqual(computeTotal(fixture), 110956);
  });

  it("returns 0 for an empty fixture", () => {
    assert.strictEqual(computeTotal([]), 0);
  });

  it("is deterministic across repeated calls", () => {
    const fixture: Transaction[] = [txn(100000, "2026-11-01"), txn(25000, "2026-11-02")];
    assert.strictEqual(computeTotal(fixture), computeTotal(fixture));
  });
});

describe("computeBudgetRemaining", () => {
  it("returns remaining budget when spent is under budget", () => {
    assert.strictEqual(computeBudgetRemaining(1000000, 300000), 700000);
  });

  it("returns 0 when spent meets budget exactly", () => {
    assert.strictEqual(computeBudgetRemaining(500000, 500000), 0);
  });

  it("returns 0 (not negative) when spent exceeds budget", () => {
    assert.strictEqual(computeBudgetRemaining(100000, 200000), 0);
  });
});

describe("computeTrend", () => {
  it("groups transactions by month and sums amounts", () => {
    const fixture: Transaction[] = [
      txn(100000, "2026-10-15", "Food"),
      txn(50000, "2026-10-20", "Food"),
      txn(75000, "2026-11-05", "Transport"),
    ];
    const trend = computeTrend(fixture);
    assert.strictEqual(trend.length, 2);
    const oct = trend.find((t) => t.period === "2026-10");
    const nov = trend.find((t) => t.period === "2026-11");
    assert.ok(oct);
    assert.ok(nov);
    assert.strictEqual(oct!.totalMinor, 150000);
    assert.strictEqual(nov!.totalMinor, 75000);
  });

  it("returns an empty trend for no transactions", () => {
    assert.deepStrictEqual(computeTrend([]), []);
  });

  it("orders periods chronologically", () => {
    const fixture: Transaction[] = [
      txn(1000, "2026-12-01"),
      txn(2000, "2026-09-01"),
      txn(3000, "2026-11-01"),
    ];
    const trend = computeTrend(fixture);
    assert.deepStrictEqual(
      trend.map((t) => t.period),
      ["2026-09", "2026-11", "2026-12"],
    );
  });
});
