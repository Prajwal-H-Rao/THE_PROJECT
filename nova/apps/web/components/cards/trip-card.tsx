/**
 * Nova design system - TripCard domain variant.
 * Renders a trip domain card in one of five states via CardState.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";

interface TripCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

function TripCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  destination,
  startDate,
  endDate,
  status,
}: TripCardProps) {
  return (
    <CardState
      state={state}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      deniedMessage={deniedMessage}
    >
      <div className="flex flex-col gap-2">
        {destination && (
          <h4 className="text-sm font-semibold text-foreground">{destination}</h4>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {startDate && endDate && (
            <span>{startDate} — {endDate}</span>
          )}
          {status && (
            <span className="ml-auto">{status}</span>
          )}
        </div>
      </div>
    </CardState>
  );
}

export { TripCard };
export type { TripCardProps };
