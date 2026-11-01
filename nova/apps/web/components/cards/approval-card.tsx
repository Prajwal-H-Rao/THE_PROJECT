/**
 * Nova design system - ApprovalCard domain variant.
 * Renders an approval domain card in one of five states via CardState.
 * Shows hash, expiry and consequence for pending approvals.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";

interface ApprovalCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  tool?: string;
  hash?: string;
  expiry?: string;
  consequence?: string;
}

function ApprovalCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  tool,
  hash,
  expiry,
  consequence,
}: ApprovalCardProps) {
  return (
    <CardState
      state={state}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      deniedMessage={deniedMessage}
    >
      <div className="flex flex-col gap-2">
        {tool && <h4 className="text-sm font-semibold text-foreground">{tool}</h4>}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {hash && <span className="font-mono truncate">{hash}</span>}
        </div>
        {expiry && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Expires:</span>
            <span className="font-mono">{expiry}</span>
          </div>
        )}
        {consequence && (
          <p className="text-sm text-muted-foreground">{consequence}</p>
        )}
      </div>
    </CardState>
  );
}

export { ApprovalCard };
export type { ApprovalCardProps };
