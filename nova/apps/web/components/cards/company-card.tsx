/**
 * Nova design system - CompanyCard domain variant.
 * Renders one company with its source count and opening count.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";
import { Badge } from "@/components/ui/badge";
import type { Company } from "@/lib/api-types";

interface CompanyCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  company?: Company;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" {
  switch (status) {
    case "verified":
      return "success";
    case "blocked":
    case "archived":
      return "destructive";
    case "unverified":
      return "warning";
    default:
      return "secondary";
  }
}

function CompanyCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  company,
}: CompanyCardProps) {
  return (
    <CardState
      state={state}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      deniedMessage={deniedMessage}
    >
      {state === "default" && company && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              {company.name}
            </h4>
            <Badge variant={statusVariant(company.status)} className="text-xs">
              {company.region}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{company.status}</span>
            <span className="mx-1">•</span>
            <span>{company.sourcesCount} sources</span>
            <span className="mx-1">•</span>
            <span>{company.openingsCount} openings</span>
          </div>
          {company.lastPollAt && (
            <p className="text-xs text-muted-foreground">
              Last polled: {company.lastPollAt}
            </p>
          )}
        </div>
      )}
    </CardState>
  );
}

export { CompanyCard };
export type { CompanyCardProps };
