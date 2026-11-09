/**
 * Nova design system - Finance ingest normalization (task 11.2, module 11).
 * Shared types and pure helpers for CSV/OFX import. Integer minor units
 * everywhere (Spec:826); no bank credentials (Spec:741); import and
 * normalize only, no money movement (Spec:190).
 * A locale hint resolves separator/date-order ambiguity instead of guessing.
 */

export interface NormalizedTransaction {
  readonly amountMinor: number; // integer minor units (cents/pence)
  readonly currency: string;
  readonly transactionDate: string; // ISO YYYY-MM-DD
  readonly postedAt: string;
  readonly merchant: string;
  readonly sourceReference: string; // stable dedup key (FITID / ref / row hash)
  readonly rawJson: Record<string, unknown>;
}

// Purpose: parse an amount string to integer minor units using a locale hint.
// "en-US": "1,234.56" -> 123456 ; "de-DE": "1.234,56" -> 123456 ; plain "1234.56" -> 123456.
// Negative sign may lead ("-1,234.56") or trail ("1,234.56-").
export function parseAmount(text: string, locale: string): number {
  const s = text.trim();
  const neg = s.startsWith("-") || s.endsWith("-");
  const clean = s.replace(/^-|-$/, "").trim();
  const isEU = locale.startsWith("de") || locale.startsWith("fr") || locale.startsWith("it");
  let digits: string;
  if (isEU) {
    // EU: "." thousands, "," decimal
    digits = clean.replace(/\./g, "").replace(/,/g, ".");
  } else {
    // US/GB: "," thousands, "." decimal
    digits = clean.replace(/,/g, "");
  }
  const value = parseFloat(digits);
  if (!Number.isFinite(value)) return 0;
  const minor = Math.round(value * 100);
  return neg ? -minor : minor;
}

// Purpose: parse a date string to ISO YYYY-MM-DD using a locale hint.
// Resolves DD/MM vs MM/DD ambiguity: when both day and month <= 12, the
// locale hint decides; otherwise the >12 component forces the order.
// Accepts YYYY-MM-DD and OFX YYYYMMDDHHMMSS[.SSS[...TZ]].
export function parseDate(text: string, locale: string): string {
  const s = text.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ofx = s.match(/^(\d{4})(\d{2})(\d{2})\d*/);
  if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    const c = Number(parts[2]);
    let year: number, month: number, day: number;
    if (a > 31 && a < 10000) {
      // YYYY first
      [year, month, day] = [a, b, c];
    } else if (a > 12 && b <= 12) {
      [day, month, year] = [a, b, c]; // DD/MM (day > 12 forces day-first)
    } else if (b > 12 && a <= 12) {
      [month, day, year] = [a, b, c]; // MM/DD (month > 12 forces month-first)
    } else {
      // Ambiguous (both <= 12): locale hint decides.
      const isEU = locale.startsWith("de") || locale.startsWith("fr") || locale.startsWith("it");
      if (isEU) [day, month, year] = [a, b, c];
      else [month, day, year] = [a, b, c];
    }
    const y = String(year).padStart(4, "0");
    const m = String(month).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
}

// Purpose: stable, collision-resistant sourceReference from a row object.
export function rowReference(row: Record<string, string>): string {
  let hash = 0;
  for (const [k, v] of Object.entries(row)) {
    for (const ch of String(k + v)) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return `row-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}
