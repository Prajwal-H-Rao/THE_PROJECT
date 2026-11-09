/**
 * Nova design system - CSV import parser (task 11.2, module 11).
 * Parses bank/credit-card CSV exports with encoding and locale variants.
 * Pure function: text -> NormalizedTransaction[], no pg, no credentials.
 * Spec:826 integer minor units; Spec:741 isolated import parser.
 */

import { parseAmount, parseDate, NormalizedTransaction, rowReference } from "./normalize.js";

// Purpose: strip a leading UTF-8 BOM if present.
function stripBOM(text: string): string {
  return text.startsWith("\uFEFF") ? text.slice(1) : text;
}

// Purpose: detect the field delimiter from the header line.
function detectDelimiter(header: string): "," | ";" | "\t" {
  if (header.includes("\t")) return "\t";
  if (header.includes(";")) return ";";
  return ",";
}

// Purpose: normalize a header cell (trim, lowercase, collapse spaces).
function normalizeHeader(cell: string): string {
  return cell.trim().toLowerCase().replace(/\s+/g, "_");
}

// Purpose: map normalized header names to canonical fields.
function fieldOf(header: string): "amount" | "date" | "merchant" | "currency" | "reference" | null {
  if (/amount|sum|total|value/.test(header)) return "amount";
  if (/date|posted|value_date|trans_date/.test(header)) return "date";
  if (/merchant|payee|counterparty|recipient|description|memo/.test(header)) return "merchant";
  if (/currency|ccy/.test(header)) return "currency";
  if (/ref|reference|id|fitid|transaction_id/.test(header)) return "reference";
  return null;
}

// Purpose: parse CSV text into NormalizedTransaction[] using a locale hint.
export function parseCSV(text: string, locale = "en-US"): NormalizedTransaction[] {
  const clean = stripBOM(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const delim = detectDelimiter(lines[0]!);
  const headers = lines[0]!.split(delim).map(normalizeHeader);
  const fields = headers.map(fieldOf);
  let amountIdx = -1;
  let dateIdx = -1;
  let merchantIdx = -1;
  let currencyIdx = -1;
  let referenceIdx = -1;
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (f === "amount") amountIdx = i;
    else if (f === "date") dateIdx = i;
    else if (f === "merchant") merchantIdx = i;
    else if (f === "currency") currencyIdx = i;
    else if (f === "reference") referenceIdx = i;
  }

  const txns: NormalizedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(delim);
    const cell = (idx: number): string => {
      const v = cells[idx];
      return v === undefined ? "" : v;
    };
    const amountRaw = cell(amountIdx);
    const dateRaw = cell(dateIdx);
    const merchant = cell(merchantIdx) || "Unknown";
    const currency = cell(currencyIdx) || "USD";

    if (amountRaw.length === 0 && dateRaw.length === 0) continue;

    const amountMinor = parseAmount(amountRaw, locale);
    const transactionDate = parseDate(dateRaw, locale);
    const postedAt = transactionDate;
    const rowMap: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j]!;
      rowMap[h] = cell(j);
    }
    const reference = referenceIdx >= 0 ? cell(referenceIdx) || rowReference(rowMap) : rowReference(rowMap);

    txns.push({
      amountMinor,
      currency,
      transactionDate,
      postedAt,
      merchant,
      sourceReference: reference,
      rawJson: {},
    });
  }
  return txns;
}
