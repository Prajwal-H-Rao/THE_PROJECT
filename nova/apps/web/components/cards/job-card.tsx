/**
 * Nova design system - JobCard domain variant.
 * Renders a job domain card in one of five states via CardState.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";

interface JobCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  title?: string;
  company?: string;
  location?: string;
}

function JobCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  title,
  company,
  location,
}: JobCardProps) {
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
          {company && <span>{company}</span>}
          {location && <span className="mx-1">•</span>}
          {location && <span>{location}</span>}
        </div>
      </div>
    </CardState>
  );
}

export { JobCard };
export type { JobCardProps };
