/**
 * Nova design system - Finance and Trips page (task 11.17, module 11).
 * Period selector, net and cash-flow cards, category chart, import
 * provenance and review queue. Trips section: map with stops, route
 * timeline, transport options, booking links carrying estimate labels
 * (spec:410, spec:411). All finance totals computed deterministically in
 * integer minor units (spec:826). No money movement (spec:190).
 * Data is received via props (calendar page pattern) for testability.
 */

"use client";

import { useState } from "react";
import { CardState } from "@/components/ui/card-state";
import { SummaryCards } from "./components/summary-cards";
import { CategoryChart } from "./components/category-chart";
import { ImportProvenance } from "./components/import-provenance";
import { ReviewQueue } from "./components/review-queue";
import { TripsSection } from "./components/trips-section";
import type { FinanceSummary, FinanceTransaction, Trip } from "@/lib/api-types";

interface FinancePageProps {
  transactions?: FinanceTransaction[];
  trips?: Trip[];
  summary?: FinanceSummary;
}

export function FinancePage({
  transactions = [],
  trips = [],
  summary,
}: FinancePageProps) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Period filter: include transactions whose transactionDate falls within
  // [startDate, endDate] inclusive. Empty bounds mean no filter.
  const filtered = transactions.filter((tx) => {
    if (startDate && tx.transactionDate < startDate) return false;
    if (endDate && tx.transactionDate > endDate) return false;
    return true;
  });

  // Deterministic summary computation (spec:826): integer minor units only.
  const computedSummary: FinanceSummary = summary ?? {
    netMinor: filtered.reduce((acc, tx) => acc + tx.amountMinor, 0),
    cashFlowMinor: filtered.reduce((acc, tx) => acc + tx.amountMinor, 0),
    transactionCount: filtered.length,
    categoryTotals: Object.fromEntries(
      Object.entries(
        filtered.reduce<Record<string, number>>((acc, tx) => {
          acc[tx.category] = (acc[tx.category] ?? 0) + tx.amountMinor;
          return acc;
        }, {}),
      ).sort(([a], [b]) => a.localeCompare(b)),
    ),
    importCount: new Set(filtered.map((tx) => tx.source)).size,
  };

  if (!transactions.length && !trips.length) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Finance & Trips</h1>
        <CardState
          state="empty"
          emptyLabel="No finance or trips data"
          emptyMessage="Import statements or create a trip plan to see data here."
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Finance & Trips</h1>
        <div className="flex gap-2">
          <label className="text-sm text-muted-foreground">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded border border-border bg-input px-2 py-1 text-xs"
            aria-label="Start date"
          />
          <label className="text-sm text-muted-foreground">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded border border-border bg-input px-2 py-1 text-xs"
            aria-label="End date"
          />
        </div>
      </div>
      <SummaryCards summary={computedSummary} />
      <CategoryChart summary={computedSummary} />
      <ImportProvenance transactions={filtered} />
      <ReviewQueue transactions={filtered} />
      <TripsSection trips={trips} />
    </div>
  );
}

export default FinancePage;
