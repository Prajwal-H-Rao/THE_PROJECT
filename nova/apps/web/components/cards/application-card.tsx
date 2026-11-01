/**
 * Nova design system - ApplicationCard domain variant.
 * Renders an application domain card in one of five states via CardState.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";

interface ApplicationCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  role?: string;
  company?: string;
  status?: string;
}

function ApplicationCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  role,
  company,
  status,
}: ApplicationCardProps) {
  return (
    <CardState
      state={state}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      deniedMessage={deniedMessage}
    >
      <div className="flex flex-col gap-2">
        {role && <h4 className="text-sm font-semibold text-foreground">{role}</h4>}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {company && <span>{company}</span>}
          {status && (
            <span className="ml-auto">{status}</span>
          )}
        </div>
      </div>
    </CardState>
  );
}

export { ApplicationCard };
export type { ApplicationCardProps };
