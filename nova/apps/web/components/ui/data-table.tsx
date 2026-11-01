/**
 * Nova design system - DataTable component.
 * Provides table with header, rows and optional empty state.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DataTableProps {
  columns: string[];
  rows: Record<string, string>[];
  emptyMessage?: string;
}

function DataTable({
  columns,
  rows,
  emptyMessage,
}: DataTableProps) {
  if (rows.length === 0) {
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse border border-border">
          <tbody>
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse border border-border">
        <thead>
          <tr className="bg-muted text-xs text-muted-foreground uppercase tracking-wider">
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 font-medium border-b border-border">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/50"}>
              {columns.map((col) => (
                <td key={col} className="px-4 py-3 text-sm border-b border-border">
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { DataTable };
