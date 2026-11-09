/**
 * Nova design system - Statement import test (task 11.3, module 11).
 * Test-first: written before the importer. Confirmed failing, then passing.
 * Parses a PDF statement through the document service and keeps row/column
 * refs on every finance row (sourceReference + rawJson column refs).
 * Spec:826 integer minor units; Spec:741 isolated import (no pg, no creds).
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { importParsedStatement } from "./statement.js";
import type { CreateFinanceTransactionInput } from "../finance-entity.js";

function sourceSpan(page: number, line: number, column: number, raw: string): Record<string, unknown> {
  return {
    page,
    line,
    column,
    char_start: 0,
    char_end: raw.length,
    bbox: [50, 100, 200, 110],
    raw_text: raw,
  };
}

function parsedDoc(fields: Array<{ field_name: string; value: string; source: Record<string, unknown> }>): Record<string, unknown> {
  return {
    metadata: {
      document_id: "doc-1",
      original_filename: "statement.pdf",
      mime_type: "application/pdf",
      file_size: 1000,
      sha256: "abc123",
      page_count: 1,
      parser_version: "pdf_parser",
      parsed_at: "2026-11-09T12:00:00Z",
      processing_time_ms: 10,
    },
    fields: fields.map((f) => ({
      field_name: f.field_name,
      value: f.value,
      source_ref: f.source,
      confidence: { value: 1.0, method: "parser", threshold: 0.9 },
      review_status: "reviewed",
      parser_version: "pdf_parser",
      metadata: {},
    })),
    raw_content: "2026-11-05 Grocery Store 1,234.56\n",
    structure: {},
    warnings: [],
  } as Record<string, unknown>;
}

describe("importParsedStatement", () => {
  it("maps parsed statement fields to finance transactions keeping row/column refs", () => {
    const doc = parsedDoc([
      { field_name: "date", value: "2026-11-05", source: sourceSpan(1, 5, 1, "2026-11-05") },
      { field_name: "merchant", value: "Grocery Store", source: sourceSpan(1, 5, 20, "Grocery Store") },
      { field_name: "amount", value: "1,234.56", source: sourceSpan(1, 5, 50, "1,234.56") },
    ]);
    const result = importParsedStatement(doc, "user-1");
    const txns = result.transactions as CreateFinanceTransactionInput[];
    assert.ok(txns.length > 0, "should produce at least one transaction");
    const t = txns[0]!;
    assert.strictEqual(t.userId, "user-1");
    // sourceReference keeps the row ref (page:line:column).
    assert.ok(typeof t.sourceReference === "string" && t.sourceReference.length > 0);
    assert.ok(t.sourceReference.includes("1"), "sourceReference keeps page ref");
    assert.ok(t.sourceReference.includes("5"), "sourceReference keeps line ref");
    // rawJson keeps the column refs (page, line, column, bbox, raw_text)
    // keyed by field name.
    assert.ok(t.rawJson, "rawJson keeps column refs");
    const amountRef = t.rawJson["amount"] as Record<string, unknown>;
    assert.strictEqual(amountRef["page"], 1);
    assert.strictEqual(amountRef["line"], 5);
    assert.strictEqual(amountRef["column"], 50);
    assert.ok(Array.isArray(amountRef["bbox"]), "rawJson keeps bbox");
    // Integer minor units (Spec:826): no floats.
    assert.ok(Number.isInteger(t.amountMinor), "amountMinor is an integer");
    assert.strictEqual(t.currency, "USD");
  });

  it("parses amount to integer minor units", () => {
    const doc = parsedDoc([
      { field_name: "amount", value: "1,234.56", source: sourceSpan(1, 1, 1, "1,234.56") },
      { field_name: "date", value: "2026-11-05", source: sourceSpan(1, 1, 10, "2026-11-05") },
      { field_name: "merchant", value: "Cafe", source: sourceSpan(1, 1, 20, "Cafe") },
    ]);
    const txns = importParsedStatement(doc, "user-1").transactions as CreateFinanceTransactionInput[];
    const t = txns[0]!;
    assert.strictEqual(t.amountMinor, 123456);
  });

  it("returns empty transactions for an empty parsed document", () => {
    const doc = parsedDoc([]);
    const result = importParsedStatement(doc, "user-1");
    assert.strictEqual(result.transactions.length, 0);
  });

  it("keeps source_reference stable across re-import (dedup-friendly)", () => {
    const doc = parsedDoc([
      { field_name: "amount", value: "10.00", source: sourceSpan(1, 3, 5, "10.00") },
      { field_name: "date", value: "2026-11-01", source: sourceSpan(1, 3, 1, "2026-11-01") },
      { field_name: "merchant", value: "Shop", source: sourceSpan(1, 3, 15, "Shop") },
    ]);
    const a = importParsedStatement(doc, "user-1").transactions as CreateFinanceTransactionInput[];
    const b = importParsedStatement(doc, "user-1").transactions as CreateFinanceTransactionInput[];
    assert.ok(a.length > 0 && b.length > 0, "both imports produce transactions");
    assert.strictEqual(a[0]!.sourceReference, b[0]!.sourceReference);
  });
});
