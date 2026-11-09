/**
 * Nova design system - Currency converter (task 11.5, module 11).
 * Deterministic conversion using integer minor units only (Spec:826).
 * Round half up, away from zero. Same currency is identity 1:1.
 * No pg, no credentials (Spec:741); import/normalize only (Spec:190).
 */

import { RateTable } from "./rates.js";

export interface ConversionResult {
  readonly convertedAmountMinor: number; // integer minor units
  readonly rateUsed: string; // "numerator/denominator"
  readonly effectiveDate: string; // ISO YYYY-MM-DD
}

// Purpose: round half up (away from zero) using pure integer math.
// roundHalfUp(a * num / den) = floor((2*a*num + den) / (2*den)).
function roundHalfUp(amountMinor: number, numerator: number, denominator: number): number {
  const sign = amountMinor < 0 ? -1 : 1;
  const abs = Math.abs(amountMinor);
  return sign * Math.floor((2 * abs * numerator + denominator) / (2 * denominator));
}

// Purpose: convert amountMinor from one currency to another using the rate
// effective on-or-before the given date. Throws when no rate exists.
export function convert(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  date: string,
  rateTable: RateTable,
): ConversionResult {
  // Same currency: identity 1:1, no rate lookup needed.
  if (fromCurrency === toCurrency) {
    return {
      convertedAmountMinor: amountMinor,
      rateUsed: "1/1",
      effectiveDate: date,
    };
  }

  const rate = rateTable.getRate(fromCurrency, toCurrency, date);
  if (rate === null) {
    throw new Error(
      `no rate for ${fromCurrency}->${toCurrency} on or before ${date}`,
    );
  }

  const convertedAmountMinor = roundHalfUp(
    amountMinor,
    rate.numerator,
    rate.denominator,
  );

  return {
    convertedAmountMinor,
    rateUsed: `${rate.numerator}/${rate.denominator}`,
    effectiveDate: rate.effectiveDate,
  };
}
