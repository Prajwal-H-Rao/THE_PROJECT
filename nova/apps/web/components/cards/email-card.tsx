/**
 * Nova design system - EmailCard domain variant.
 * Renders an email domain card in one of five states via CardState.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";

interface EmailCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  from?: string;
  subject?: string;
  preview?: string;
  received?: string;
}

function EmailCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  from,
  subject,
  preview,
  received,
}: EmailCardProps) {
  return (
    <CardState
      state={state}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      deniedMessage={deniedMessage}
    >
      <div className="flex flex-col gap-2">
        {from && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">{from}</span>
            {received && (
              <span className="text-xs text-muted-foreground">{received}</span>
            )}
          </div>
        )}
        {subject && <h4 className="text-sm font-semibold text-foreground">{subject}</h4>}
        {preview && <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>}
      </div>
    </CardState>
  );
}

export { EmailCard };
export type { EmailCardProps };
