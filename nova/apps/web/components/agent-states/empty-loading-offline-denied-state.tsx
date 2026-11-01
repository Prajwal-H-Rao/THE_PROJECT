/**
 * Nova design system - EmptyLoadingOfflineDeniedState agent state.
 * Shows one of four empty/loading/offline/permission-denied states.
 * No blank page, no fake data.
 */

"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface EmptyLoadingOfflineDeniedStateProps {
  kind: "empty" | "loading" | "offline" | "permission-denied";
  message?: string;
}

function EmptyLoadingOfflineDeniedState({
  kind,
  message,
}: EmptyLoadingOfflineDeniedStateProps) {
  const config: Record<string, { badge: string; title: string; defaultMessage: string }> = {
    empty: { badge: "Empty", title: "No items", defaultMessage: "No data available." },
    loading: { badge: "Loading", title: "Loading…", defaultMessage: "Please wait while content loads." },
    offline: { badge: "Offline", title: "Offline", defaultMessage: "You are currently offline." },
    "permission-denied": { badge: "Denied", title: "Permission denied", defaultMessage: "You do not have permission to view this." },
  };
  const c = config[kind];

  return (
    <Card className="w-full border border-muted">
      <CardContent className="p-6 text-center">
        {kind === "loading" && (
          <div className="flex flex-col items-center justify-center py-8" role="status" aria-busy="true" aria-label="Loading">
            <Skeleton className="w-16 h-16 rounded-full" />
            <p className="mt-2 text-sm text-muted-foreground">
              {message || c.defaultMessage}
            </p>
          </div>
        )}
        {kind !== "loading" && (
          <EmptyState
            icon={<Badge variant={kind === "offline" || kind === "permission-denied" ? "destructive" : "secondary"} className="text-xs">{c.badge}</Badge>}
            title={c.title}
            description={message || c.defaultMessage}
          />
        )}
      </CardContent>
    </Card>
  );
}

export { EmptyLoadingOfflineDeniedState };
export type { EmptyLoadingOfflineDeniedStateProps };
