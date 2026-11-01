/**
 * Nova design system - NoteCard domain variant.
 * Renders a note domain card in one of five states via CardState.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";

interface NoteCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  title?: string;
  body?: string;
  updated?: string;
}

function NoteCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  title,
  body,
  updated,
}: NoteCardProps) {
  return (
    <CardState
      state={state}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      deniedMessage={deniedMessage}
    >
      <div className="flex flex-col gap-2">
        {title && <h4 className="text-sm font-semibold text-foreground">{title}</h4>}
        {body && <p className="text-sm text-muted-foreground line-clamp-3">{body}</p>}
        {updated && (
          <span className="text-xs text-muted-foreground">Updated: {updated}</span>
        )}
      </div>
    </CardState>
  );
}

export { NoteCard };
export type { NoteCardProps };
