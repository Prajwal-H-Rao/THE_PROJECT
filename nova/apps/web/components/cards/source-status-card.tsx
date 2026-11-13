/**
 * Nova design system - SourceStatusCard domain variant.
 * Renders one source's status in one of five states via CardState.
 * Status values: verified, stale, failed, rate-limited, manual, unsupported, paused.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { CardState } from "@/components/ui/card-state";
import { Badge } from "@/components/ui/badge";
import type { SourceStatus } from "@/lib/api-types";

interface SourceStatusCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  source?: SourceStatus;
}

function statusVariant(
  status: SourceStatus["status"],
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" {
  switch (status) {
    case "verified":
      return "success";
    case "stale":
      return "warning";
    case "failed":
      return "destructive";
    case "rate-limited":
      return "warning";
    case "manual":
      return "warning";
    case "unsupported":
      return "destructive";
    case "paused":
      return "warning";
    default:
      return "secondary";
  }
}

function SourceStatusCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  source,
}: SourceStatusCardProps) {
  return (
    <CardState
      state={state}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      deniedMessage={deniedMessage}
    >
      {state === "default" && source && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              {source.employerName}
            </h4>
            <Badge variant={statusVariant(source.status)} className="text-xs">
              {source.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{source.provider}</span>
            {source.lastPollAt && (
              <span className="mx-1">•</span>
            )}
            {source.lastPollAt && <span>Last polled: {source.lastPollAt}</span>}
          </div>
          {source.reason && (
            <p className="text-xs text-muted-foreground">
              {source.reason}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Openings: {source.openingsCount}</span>
            {source.lastSuccessAt && (
              <span>
                Last success: {source.lastSuccessAt}
              </span>
            )}
          </div>
        </div>
      )}
    </CardState>
  );
}

export { SourceStatusCard };
export type { SourceStatusCardProps };
