/**
 * Nova design system - Category chart (task 11.17, module 11).
 * Renders a div-based horizontal bar chart of spending by category.
 * No canvas or SVG library dependency. All values are integer minor units
 * (spec:826). Bars are labelled with category and amount (not colour
 * alone, spec:279).
 */

"use client";

import type { FinanceSummary } from "@/lib/api-types";

interface CategoryChartProps {
  readonly summary: FinanceSummary;
}

// Purpose: render one category bar with label and value.
function Bar({ category, amount, max }: { readonly category: string; readonly amount: number; readonly max: number }) {
  const pct = max > 0 ? Math.round((Math.abs(amount) / max) * 100) : 0;
  return (
    <div key={category} className="flex items-center gap-3">
      <span className="w-20 text-sm text-foreground">{category}</span>
      <div
        className="flex-1 h-6 rounded-full border border-border bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={amount}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${category}: ${amount} minor units`}
      >
        <div
          className={`h-full ${amount >= 0 ? "bg-green" : "bg-destructive"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-sm text-right text-muted-foreground tabular-nums">
        {amount}
      </span>
    </div>
  );
}

export function CategoryChart({ summary }: CategoryChartProps) {
  const entries = Object.entries(summary.categoryTotals).sort(
    ([, a], [, b]) => Math.abs(b) - Math.abs(a),
  );
  const max = entries.reduce((m, [, v]) => Math.max(m, Math.abs(v)), 0);
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4 text-center text-muted-foreground">
        No category data for the selected period.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Spending by category</h2>
      <div className="space-y-2">
        {entries.map(([category, amount]) => (
          <Bar key={category} category={category} amount={amount} max={max} />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Values are integer minor units (spec:826). Each bar is an estimate
        until the underlying transaction is confirmed (spec:411).
      </p>
    </div>
  );
}
