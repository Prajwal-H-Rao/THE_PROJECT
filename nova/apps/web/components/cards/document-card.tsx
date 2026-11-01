/**
 * Nova design system - DocumentCard domain variant.
 * Renders a document domain card in one of five states via CardState.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";

interface DocumentCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  title?: string;
  type?: string;
  size?: string;
}

function DocumentCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  title,
  type,
  size,
}: DocumentCardProps) {
  return (
    <CardState
      state={state}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      deniedMessage={deniedMessage}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          {title && <h4 className="text-sm font-semibold text-foreground">{title}</h4>}
          {type && <span className="text-xs text-muted-foreground">{type}</span>}
        </div>
        {size && <span className="text-xs font-mono text-muted-foreground">{size}</span>}
      </div>
    </CardState>
  );
}

export { DocumentCard };
export type { DocumentCardProps };
