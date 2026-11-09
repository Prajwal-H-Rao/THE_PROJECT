/**
 * Nova design system - PDF statement importer (task 11.3, module 11).
 * Consumes a parsed document produced by the sandboxed document service and
 * maps its fields to finance transaction inputs, keeping row and column
 * refs on every row (sourceReference + rawJson column refs).
 * Pure function: no pg, no HTTP, no credentials (Spec:741). Integer minor
 * units everywhere (Spec:826). Import and normalize only (Spec:190).
 */

import { parseAmount, parseDate } from "./normalize.js";
import { computeContentHash, makeIdempotencyKey } from "./deduplicator.js";
import type { CreateFinanceTransactionInput } from "../finance-entity.js";

interface SourceSpan {
  readonly page?: number;
  readonly line?: number;
  readonly column?: number;
  readonly char_start?: number;
  readonly char_end?: number;
  readonly bbox?: number[];
  readonly raw_text?: string;
}

interface ParsedField {
  readonly field_name: string;
  readonly value: string;
  readonly source_ref?: SourceSpan;
  readonly confidence?: { readonly value: number; readonly method: string; readonly threshold?: number };
  readonly review_status?: string;
  readonly parser_version?: string;
  readonly metadata?: Record<string, unknown>;
}

interface ParsedDocumentMetadata {
  readonly document_id: string;
  readonly original_filename: string;
  readonly mime_type: string;
  readonly file_size: number;
  readonly sha256: string;
  readonly page_count: number;
  readonly parser_version: string;
  readonly parsed_at: string;
  readonly processing_time_ms: number;
}

interface ParsedDocument {
  readonly metadata: ParsedDocumentMetadata;
  readonly fields: ParsedField[];
  readonly raw_content?: string;
  readonly structure?: Record<string, unknown>;
  readonly warnings?: string[];
}

export interface StatementImportResult {
  readonly transactions: CreateFinanceTransactionInput[];
  readonly warnings: string[];
}

// Purpose: serialize a source span to a stable, deterministic row reference
// so re-importing the same statement yields the same sourceReference
// (dedup-friendly, ties to task 11.4).
function serializeSourceRef(span: SourceSpan | undefined): string {
  if (!span) return "row-unknown";
  const parts: string[] = [];
  if (span.page !== undefined) parts.push(`p${span.page}`);
  if (span.line !== undefined) parts.push(`l${span.line}`);
  if (span.column !== undefined) parts.push(`c${span.column}`);
  if (span.bbox && Array.isArray(span.bbox)) parts.push(`b${span.bbox.join(",")}`);
  return parts.length > 0 ? parts.join(":") : `row-${span.raw_text ?? ""}`;
}

// Purpose: group parsed fields into rows by page+line from their source_ref.
function groupFieldsByRow(fields: ParsedField[]): Map<string, ParsedField[]> {
  const rows = new Map<string, ParsedField[]>();
  for (const field of fields) {
    const span = field.source_ref as SourceSpan | undefined;
    const rowKey = `${span?.page ?? 0}:${span?.line ?? 0}`;
    const existing = rows.get(rowKey) ?? [];
    existing.push(field);
    rows.set(rowKey, existing);
  }
  return rows;
}

// Purpose: map a parsed document's fields to finance transaction inputs,
// keeping row and column refs (source_reference + rawJson column refs).
export function importParsedStatement(
  parsedDocument: unknown,
  userId: string,
): StatementImportResult {
  const doc = parsedDocument as ParsedDocument;
  const fields = doc.fields ?? [];
  const rows = groupFieldsByRow(fields);

  const transactions: CreateFinanceTransactionInput[] = [];
  for (const rowFields of rows.values()) {
    const amountField = rowFields.find((f) => f.field_name === "amount");
    const dateField = rowFields.find((f) => f.field_name === "date");
    const merchantField = rowFields.find((f) => f.field_name === "merchant");
    const currencyField = rowFields.find((f) => f.field_name === "currency");

    const amountMinor = amountField ? parseAmount(amountField.value, "en-US") : 0;
    const currency = currencyField ? currencyField.value : "USD";
    const transactionDate = dateField ? parseDate(dateField.value, "en-US") : "";
    const merchant = merchantField?.value ?? "Unknown";

    const refSpan = amountField?.source_ref ?? rowFields[0]?.source_ref;
    const sourceReference = serializeSourceRef(refSpan as SourceSpan | undefined);

    // rawJson keeps the column refs (page, line, column, bbox, raw_text) for
    // every field in the row, so each row traces back to its source location.
    const columnRefs: Record<string, unknown> = {};
    for (const field of rowFields) {
      const span = field.source_ref as SourceSpan | undefined;
      columnRefs[field.field_name] = {
        page: span?.page ?? null,
        line: span?.line ?? null,
        column: span?.column ?? null,
        bbox: span?.bbox ?? null,
        raw_text: span?.raw_text ?? null,
      };
    }

    // Content-addressed idempotency key: identical transaction content from
    // any source (CSV or PDF) yields the same key, so re-import is a no-op.
    const contentHash = computeContentHash({
      amountMinor,
      currency,
      transactionDate,
      merchant,
      source: "pdf-statement",
      userId,
    });
    const idempotencyKey = makeIdempotencyKey(userId, contentHash);

    transactions.push({
      userId,
      source: "pdf-statement",
      sourceReference,
      amountMinor,
      currency,
      transactionDate,
      postedAt: transactionDate,
      merchant,
      category: "uncategorised",
      idempotencyKey,
      rawJson: columnRefs,
    });
  }

  return { transactions, warnings: [] };
}
