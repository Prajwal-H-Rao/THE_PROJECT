/**
 * Nova design system - Review queue (task 11.17, module 11).
 * Surfaces import rows whose category confidence is below a threshold
 * (uncertain rows). High-confidence rows are excluded (task 11.8 pattern).
 * Deterministic: same queue state always yields the same output.
 */

"use client";

import { DataTable } from "@/components/ui/data-table";
import type { FinanceTransaction } from "@/lib/api-types";

interface ReviewQueueProps {
  readonly transactions: readonly FinanceTransaction[];
}

// Threshold below which a category draft is considered uncertain (task 11.8).
const UNCERTAIN_THRESHOLD = 0.7;

// Purpose: map an uncertain transaction to a review row.
function toRow(tx: FinanceTransaction): Record<string, string> {
  return {
    Transaction: tx.transactionId,
    Merchant: tx.merchant,
    Category: tx.category,
    Confidence: (tx.categoryConfidence * 100).toFixed(0) + "%",
    Reason: tx.categoryConfidenceReason ?? "—",
    Source: tx.source,
  };
}

export function ReviewQueue({ transactions }: ReviewQueueProps) {
  const uncertain = transactions.filter(
    (tx) => tx.categoryConfidence < UNCERTAIN_THRESHOLD,
  );
  if (uncertain.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4 text-center text-muted-foreground">
        No uncertain rows in the review queue.
      </div>
    );
  }
  const columns = ["Transaction", "Merchant", "Category", "Confidence", "Reason", "Source"];
  const rows = uncertain.map(toRow);
  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Review queue</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Rows with category confidence below {Math.round(
          UNCERTAIN_THRESHOLD * 100,
        )}% require manual review (task 11.8).
      </p>
      <DataTable columns={columns} rows={rows} emptyMessage="All rows reviewed." />
    </div>
  );
}
