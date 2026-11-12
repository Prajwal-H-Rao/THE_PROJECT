/**
 * Nova design system - Summary cards (task 11.17, module 11).
 * Renders net and cash-flow cards from a FinanceSummary. All values are
 * integer minor units, displayed in the summary currency. Computed
 * deterministically by the page (spec:826).
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceSummary } from "@/lib/api-types";

interface SummaryCardsProps {
  readonly summary: FinanceSummary;
}

// Purpose: format minor units as a currency string with sign.
function formatMinor(amountMinor: number, currency: string): string {
  const sign = amountMinor < 0 ? "-" : "";
  const abs = Math.abs(amountMinor);
  const units = Math.floor(abs / 100);
  const minor = abs % 100;
  return `${sign}${currency} ${units}.${String(minor).padStart(2, "0")}`;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const currency = "USD";
  const isPositive = summary.netMinor >= 0;
  const netVariant = isPositive ? "default" : "destructive";
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm">Net flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-foreground">
            {formatMinor(summary.netMinor, currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            Income minus expenses over the selected period.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm">Cash flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-semibold ${netVariant}`}>
            {formatMinor(summary.cashFlowMinor, currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            Net change in cash position. Every value is an estimate unless
            confirmed by a posted transaction (spec:411).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
