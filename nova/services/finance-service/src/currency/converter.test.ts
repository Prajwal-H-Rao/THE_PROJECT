/**
 * Nova design system - Currency converter test (task 11.5, module 11).
 * Test-first: written before converter.ts. Confirmed failing, then passing.
 * Deterministic currency conversion with a dated rate table. Integer minor
 * units only (Spec:826); no pg, no credentials (Spec:741).
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { convert, type ConversionResult } from "./converter.js";
import { RateTable } from "./rates.js";

function rateTable(): RateTable {
  const rt = new RateTable();
  rt.addRate("USD", "EUR", "2026-01-01", 90, 100);   // 0.90 EUR per USD
  rt.addRate("USD", "EUR", "2026-06-01", 85, 100);   // 0.85 EUR per USD (later)
  rt.addRate("EUR", "USD", "2026-01-01", 110, 100);  // 1.10 USD per EUR
  rt.addRate("USD", "JPY", "2026-01-01", 150, 1);    // 150 JPY per USD
  return rt;
}

describe("convert", () => {
  it("converts at the rate effective on-or-before the given date", () => {
    const rt = rateTable();
    // Before 2026-06-01: 0.90. 1000 USD -> 900 EUR.
    const jan = convert(1000, "USD", "EUR", "2026-03-01", rt);
    assert.strictEqual(jan.convertedAmountMinor, 900);
    assert.strictEqual(jan.rateUsed, "90/100");
    assert.strictEqual(jan.effectiveDate, "2026-01-01");
    // On/after 2026-06-01: 0.85. 1000 USD -> 850 EUR.
    const jun = convert(1000, "USD", "EUR", "2026-07-01", rt);
    assert.strictEqual(jun.convertedAmountMinor, 850);
    assert.strictEqual(jun.rateUsed, "85/100");
    assert.strictEqual(jun.effectiveDate, "2026-06-01");
  });

  it("same currency is identity 1:1 without a rate lookup", () => {
    const rt = rateTable();
    const r = convert(12345, "USD", "USD", "2026-03-01", rt);
    assert.strictEqual(r.convertedAmountMinor, 12345);
    assert.strictEqual(r.rateUsed, "1/1");
    assert.strictEqual(r.effectiveDate, "2026-03-01");
  });

  it("rounds half up in integer minor units", () => {
    const rt = new RateTable();
    rt.addRate("USD", "EUR", "2026-01-01", 1, 3);  // 1/3 EUR per USD
    // 1 USD -> 0.3333... EUR -> 33.333... minor units -> 33 (half-up).
    const r = convert(100, "USD", "EUR", "2026-01-01", rt);
    assert.strictEqual(r.convertedAmountMinor, 33);
  });

  it("rounds half up on exact half", () => {
    const rt = new RateTable();
    rt.addRate("USD", "EUR", "2026-01-01", 1, 2);  // 0.5 EUR per USD
    // 1 USD -> 0.5 EUR -> 50 minor units exactly.
    const r = convert(100, "USD", "EUR", "2026-01-01", rt);
    assert.strictEqual(r.convertedAmountMinor, 50);
  });

  it("throws when no rate exists for the currency pair", () => {
    const rt = rateTable();
    assert.throws(() => convert(100, "USD", "GBP", "2026-01-01", rt), /no rate/);
  });

  it("throws when no effective rate exists on-or-before the date", () => {
    const rt = new RateTable();
    rt.addRate("USD", "EUR", "2026-06-01", 85, 100);
    assert.throws(() => convert(100, "USD", "EUR", "2026-01-01", rt), /no rate/);
  });
});
