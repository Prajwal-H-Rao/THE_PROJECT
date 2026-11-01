/**
 * Nova design system - EventCard domain variant.
 * Renders an event domain card in one of five states via CardState.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";

interface EventCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  title?: string;
  date?: string;
  location?: string;
}

function EventCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  title,
  date,
  location,
}: EventCardProps) {
  return (
    <CardState
      state={state}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      deniedMessage={deniedMessage}
    >
      <div className="flex flex-col gap-2">
        {title && <h4 className="text-sm font-semibold text-foreground">{title}</h4>}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {date && <span>{date}</span>}
          {location && <span className="mx-1">•</span>}
          {location && <span>{location}</span>}
        </div>
      </div>
    </CardState>
  );
}

export { EventCard };
export type { EventCardProps };
