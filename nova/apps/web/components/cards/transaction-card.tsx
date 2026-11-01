/**
 * Nova design system - TransactionCard domain variant.
 * Renders a transaction domain card in one of five states via CardState.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";

interface TransactionCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  merchant?: string;
  amount?: string;
  date?: string;
  type?: "debit" | "credit";
}

function TransactionCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  merchant,
  amount,
  date,
  type,
}: TransactionCardProps) {
  return (
    <CardState
      state={state}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      deniedMessage={deniedMessage}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          {merchant && <h4 className="text-sm font-semibold text-foreground">{merchant}</h4>}
          {date && <span className="text-xs text-muted-foreground">{date}</span>}
        </div>
        {amount && (
          <div className="text-sm font-mono tabular-nums text-right">
            {type === "credit" ? "+" : "-"} {amount}
          </div>
        )}
      </div>
    </CardState>
  );
}

export { TransactionCard };
export type { TransactionCardProps };
