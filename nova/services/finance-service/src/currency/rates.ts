/**
 * Nova design system - Dated rate table (task 11.5, module 11).
 * Holds exchange rates effective from a given date. getRate returns the
 * rate with the most recent effectiveDate on-or-before the query date.
 * Pure function, no pg, no credentials (Spec:741).
 */

interface RateEntry {
  readonly from: string;
  readonly to: string;
  readonly effectiveDate: string; // ISO YYYY-MM-DD
  readonly numerator: number;
  readonly denominator: number;
}

// Purpose: compare two dates (ISO YYYY-MM-DD) for ordering.
function dateCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export class RateTable {
  private readonly rates: RateEntry[] = [];

  // Purpose: add an exchange rate effective from effectiveDate.
  addRate(
    from: string,
    to: string,
    effectiveDate: string,
    numerator: number,
    denominator: number,
  ): void {
    if (denominator === 0) {
      throw new Error(`denominator must be non-zero for ${from}->${to}`);
    }
    this.rates.push({ from, to, effectiveDate, numerator, denominator });
  }

  // Purpose: get the rate with the most recent effectiveDate on-or-before
  // the given date. Returns null when no such rate exists.
  getRate(
    from: string,
    to: string,
    date: string,
  ): { numerator: number; denominator: number; effectiveDate: string } | null {
    let best: RateEntry | null = null;
    for (const rate of this.rates) {
      if (rate.from !== from || rate.to !== to) continue;
      if (dateCompare(rate.effectiveDate, date) > 0) continue; // after the query date
      if (best === null || dateCompare(rate.effectiveDate, best.effectiveDate) > 0) {
        best = rate;
      }
    }
    if (best === null) return null;
    return {
      numerator: best.numerator,
      denominator: best.denominator,
      effectiveDate: best.effectiveDate,
    };
  }
}
