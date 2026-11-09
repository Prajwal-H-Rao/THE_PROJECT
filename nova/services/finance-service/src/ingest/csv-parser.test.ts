/**
 * Nova design system - CSV parser test (task 11.2, module 11).
 * Test-first: written before the parser. Confirmed failing, then passing.
 * Each fixture imports: amounts as integer minor units, dates ISO,
 * merchant and currency parsed, sourceReference stable for dedup.
 * Spec:826 integer minor units only; Spec:741 isolated parser.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { parseCSV } from "./csv-parser.js";

function row(amount: string, date: string, merchant: string, currency = "USD", ref?: string): Record<string, string> {
  return { amount, date, merchant, currency, ...(ref ? { reference: ref } : {}) };
}

function toCSV(
  rows: Record<string, string>[],
  header = "amount,date,merchant,currency,reference",
  delim = ",",
): string {
  const lines = [header];
  for (const r of rows) lines.push(Object.values(r).join(delim));
  return lines.join("\n");
}

function first<T>(arr: T[]): T {
  assert.ok(arr.length > 0, "expected at least one row");
  return arr[0]!;
}

describe("parseCSV", () => {
  it("imports a US-locale CSV fixture (comma, MM/DD/YYYY, 1,234.56)", () => {
    const csv = toCSV([
      row("1234.56", "11/05/2026", "Grocery Store", "USD", "ref-001"),
      row("-75.00", "11/06/2026", "Cafe", "USD", "ref-002"),
    ]);
    const txns = parseCSV(csv, "en-US");
    assert.strictEqual(txns.length, 2);
    const t0 = first(txns);
    const t1 = txns[1]!;
    assert.strictEqual(t0.amountMinor, 123456);
    assert.strictEqual(t0.currency, "USD");
    assert.strictEqual(t0.transactionDate, "2026-11-05");
    assert.strictEqual(t0.merchant, "Grocery Store");
    assert.strictEqual(t0.sourceReference, "ref-001");
    assert.strictEqual(t1.amountMinor, -7500);
    assert.strictEqual(t1.transactionDate, "2026-11-06");
  });

  it("imports an EU-locale CSV fixture (semicolon, DD/MM/YYYY, 1.234,56)", () => {
    const csv = toCSV(
      [
        row("1.234,56", "05/11/2026", "Supermarche", "EUR", "ref-eu-1"),
        row("-75,00", "06/11/2026", "Cafe", "EUR", "ref-eu-2"),
      ],
      "amount;date;merchant;currency;reference",
      ";"
    );
    const txns = parseCSV(csv, "de-DE");
    assert.strictEqual(txns.length, 2);
    const t0 = first(txns);
    const t1 = txns[1]!;
    assert.strictEqual(t0.amountMinor, 123456);
    assert.strictEqual(t0.currency, "EUR");
    assert.strictEqual(t0.transactionDate, "2026-11-05");
    assert.strictEqual(t0.merchant, "Supermarche");
    assert.strictEqual(t0.sourceReference, "ref-eu-1");
    assert.strictEqual(t1.amountMinor, -7500);
  });

  it("strips a UTF-8 BOM before parsing", () => {
    const csv = "\uFEFF" + toCSV([row("10.00", "2026-11-01", "Shop", "USD", "ref-bom")]);
    const txns = parseCSV(csv, "en-US");
    assert.strictEqual(txns.length, 1);
    const t0 = first(txns);
    assert.strictEqual(t0.amountMinor, 1000);
    assert.strictEqual(t0.sourceReference, "ref-bom");
  });

  it("derives a stable sourceReference from row hash when no reference column", () => {
    const csv = toCSV([row("10.00", "2026-11-01", "Shop", "USD")], "amount,date,merchant,currency");
    const txns = parseCSV(csv, "en-US");
    assert.strictEqual(txns.length, 1);
    const t0 = first(txns);
    assert.ok(typeof t0.sourceReference === "string" && t0.sourceReference.length > 0);
    const txns2 = parseCSV(csv, "en-US");
    const t0b = first(txns2);
    assert.strictEqual(t0b.sourceReference, t0.sourceReference);
  });

  it("parses plain ISO dates and amounts without thousands separators", () => {
    const csv = toCSV([row("250", "2026-02-29", "Leap Day", "USD", "ref-leap")]);
    const txns = parseCSV(csv, "en-US");
    assert.strictEqual(txns.length, 1);
    const t0 = first(txns);
    assert.strictEqual(t0.amountMinor, 25000);
    assert.strictEqual(t0.transactionDate, "2026-02-29");
  });
});
