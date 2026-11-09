/**
 * Nova design system - Categoriser test (task 11.6, module 11).
 * Test-first: written before categoriser.ts/rules.ts/override.ts.
 * Confirmed failing, then passing.
 * Rule-based categorisation: deterministic first-match-wins with priority
 * and stable insertion-order tiebreak. Override history records applied
 * overrides per transaction. Integer minor units throughout (Spec:826);
 * no pg, no credentials (Spec:741); import/normalize/categorize only
 * (Spec:190).
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Categoriser } from "./rules.js";
import { OverrideHistory } from "./override.js";

describe("Categoriser rules", () => {
  it("returns uncategorised with no matched rule when nothing matches", () => {
    const c = new Categoriser();
    c.addRule("rule-grocery", "grocery", "Food", 10);
    const result = c.categorise("Shell petrol station", 5000, "USD");
    assert.strictEqual(result.category, "uncategorised");
    assert.strictEqual(result.matchedRuleId, null);
  });

  it("matches the first rule by priority, highest priority wins", () => {
    const c = new Categoriser();
    c.addRule("rule-shell", "shell", "Transport", 5);
    c.addRule("rule-petrol", "petrol", "Fuel", 20);
    const result = c.categorise("Shell petrol station", 5000, "USD");
    assert.strictEqual(result.category, "Fuel");
    assert.strictEqual(result.matchedRuleId, "rule-petrol");
  });

  it("breaks equal-priority ties by insertion order (first inserted wins)", () => {
    const c = new Categoriser();
    c.addRule("rule-coffee-1", "coffee", "Cafe", 10);
    c.addRule("rule-coffee-2", "coffee", "Drinks", 10);
    const result = c.categorise("Corner coffee shop", 400, "USD");
    assert.strictEqual(result.category, "Cafe");
    assert.strictEqual(result.matchedRuleId, "rule-coffee-1");
  });

  it("matches merchant case-insensitively (contains)", () => {
    const c = new Categoriser();
    c.addRule("rule-uber", "uber", "Transport", 10);
    const result = c.categorise("uber ride", 1500, "USD");
    assert.strictEqual(result.category, "Transport");
  });

  it("is deterministic: repeated calls return the same result", () => {
    const c = new Categoriser();
    c.addRule("rule-amazon", "amazon", "Shopping", 10);
    c.addRule("rule-wholefoods", "whole foods", "Food", 5);
    const first = c.categorise("AMAZON prime", 1000, "USD");
    const second = c.categorise("AMAZON prime", 1000, "USD");
    assert.deepStrictEqual(first, second);
  });
});

describe("OverrideHistory", () => {
  it("records and retrieves overrides per transaction", () => {
    const h = new OverrideHistory();
    h.recordOverride("txn-1", "uncategorised", "Food", "user corrected");
    h.recordOverride("txn-1", "Food", "Groceries", "more specific");
    const history = h.getOverrideHistory("txn-1");
    assert.strictEqual(history.length, 2);
    const h0 = history[0]!;
    const h1 = history[1]!;
    assert.strictEqual(h0.oldCategory, "uncategorised");
    assert.strictEqual(h0.newCategory, "Food");
    assert.strictEqual(h0.reason, "user corrected");
    assert.strictEqual(h1.oldCategory, "Food");
    assert.strictEqual(h1.newCategory, "Groceries");
    assert.strictEqual(h1.reason, "more specific");
    assert.ok(typeof h0.timestamp === "string" && h0.timestamp.length > 0);
  });

  it("returns an empty history for an unknown transaction", () => {
    const h = new OverrideHistory();
    assert.deepStrictEqual(h.getOverrideHistory("txn-does-not-exist"), []);
  });
});
