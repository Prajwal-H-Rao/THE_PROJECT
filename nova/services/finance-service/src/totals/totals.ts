/**
 * Nova design system - Totals computation (task 11.9, module 11).
 * Pure functions for deterministic finance totals, budget remaining and
 * trends over time periods. Integer minor units only; models summarize
 * but are not the source of truth. No pg, no credentials; categorize
 * only, no movement of money.
 */

export interface Transaction {
  readonly amountMinor: number; // integer minor units
  readonly transactionDate: string; // ISO YYYY-MM-DD
}

// Purpose: sum all transaction amounts into integer minor units.
export function computeTotal(transactions: ReadonlyArray<Transaction>): number {
  return transactions.reduce((sum, t) => sum + t.amountMinor, 0);
}

// Purpose: remaining budget. Never negative: once spent meets or exceeds
// budget, remaining is 0.
export function computeBudgetRemaining(
  budgetMinor: number,
  spentMinor: number,
): number {
  const remaining = budgetMinor - spentMinor;
  return remaining > 0 ? remaining : 0;
}

// Purpose: group transactions by ISO month (YYYY-MM) and sum amounts.
// Returns periods chronologically (earliest first).
export interface TotalsByPeriod {
  readonly period: string; // ISO YYYY-MM
  readonly totalMinor: number; // integer minor units
}

export function computeTrend(
  transactions: ReadonlyArray<Transaction>,
): TotalsByPeriod[] {
  const byPeriod = new Map<string, number>();
  for (const t of transactions) {
    const period = t.transactionDate.slice(0, 7); // YYYY-MM
    byPeriod.set(period, (byPeriod.get(period) ?? 0) + t.amountMinor);
  }
  return [...byPeriod.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([period, totalMinor]) => ({ period, totalMinor }));
}
