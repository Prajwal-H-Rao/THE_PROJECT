/**
 * Nova design system - EmptyLoadingOfflineDeniedState agent state.
 * Shows one of four empty/loading/offline/permission-denied states.
 * No blank page, no fake data.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface EmptyLoadingOfflineDeniedStateProps {
  kind: "empty" | "loading" | "offline" | "permission-denied";
  label?: string;
  title?: string;
  message?: string;
  variant?: "secondary" | "destructive" | "warning";
}

function EmptyLoadingOfflineDeniedState({
  kind,
  label,
  title,
  message,
  variant = "secondary",
}: EmptyLoadingOfflineDeniedStateProps) {
  return (
    <Card className="w-full border border-muted">
      <CardContent className="p-6 text-center">
        {kind === "loading" && (
          <div className="flex flex-col items-center justify-center py-8" role="status" aria-busy="true" aria-label={label}>
            <Skeleton className="w-16 h-16 rounded-full" />
            {label && <Badge variant={variant} className="text-xs mb-2">{label}</Badge>}
            {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
          </div>
        )}
        {kind !== "loading" && (
          <EmptyState
            icon={label && <Badge variant={variant} className="text-xs">{label}</Badge>}
            title={title}
            description={message}
          />
        )}
      </CardContent>
    </Card>
  );
}

export { EmptyLoadingOfflineDeniedState };
export type { EmptyLoadingOfflineDeniedStateProps };
