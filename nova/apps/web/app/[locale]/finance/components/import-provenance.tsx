/**
 * Nova design system - Import provenance table (task 11.17, module 11).
 * Renders every import with its source and provenance columns. Each row
 * carries source, reference, date, merchant, category, amount. Every
 * import shows its provenance (acceptance criterion).
 */

"use client";

import { DataTable } from "@/components/ui/data-table";
import type { FinanceTransaction } from "@/lib/api-types";

interface ImportProvenanceProps {
  readonly transactions: readonly FinanceTransaction[];
}

// Purpose: map a transaction to a row for the DataTable.
function toRow(tx: FinanceTransaction): Record<string, string> {
  return {
    Source: tx.source,
    Reference: tx.sourceReference,
    Date: tx.transactionDate,
    Merchant: tx.merchant,
    Category: tx.category,
    Amount: `${tx.amountMinor} ${tx.currency}`,
  };
}

export function ImportProvenance({ transactions }: ImportProvenanceProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4 text-center text-muted-foreground">
        No imports to show.
      </div>
    );
  }
  const columns = ["Source", "Reference", "Date", "Merchant", "Category", "Amount"];
  const rows = transactions.map(toRow);
  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Import provenance</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Every import shows its source and reference for audit traceability.
      </p>
      <DataTable columns={columns} rows={rows} emptyMessage="No import rows." />
    </div>
  );
}
