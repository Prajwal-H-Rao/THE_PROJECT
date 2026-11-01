/**
 * Nova design system - CardState shared primitive.
 * Renders one of five card states: default, loading, empty, error, denied.
 * Provides built-in accessibility: aria-live, role=alert for error/denied,
 * aria-busy for loading, status paired with text label (not color alone).
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface CardStateProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  children?: React.ReactNode;
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  icon?: React.ReactNode;
}

function CardState({
  state,
  children,
  emptyMessage,
  errorMessage,
  deniedMessage,
  icon,
}: CardStateProps) {
  const isDefault = state === "default";

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {state === "loading" && (
          <div className="flex flex-col items-center gap-4 py-8" aria-busy="true" role="status" aria-label="Loading">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="w-24 h-4" />
          </div>
        )}
        {state === "empty" && (
          <div className="flex flex-col items-center justify-center py-8 text-center" role="status" aria-label="Empty">
            {icon && <div className="mb-4">{icon}</div>}
            <Badge variant="secondary" className="mb-2">
              Empty
            </Badge>
            <p className="text-sm text-muted-foreground">
              {emptyMessage || "No data available"}
            </p>
          </div>
        )}
        {state === "error" && (
          <div className="flex flex-col items-center gap-2 py-8 text-center" role="alert" aria-live="polite">
            <Badge variant="destructive" className="mb-2">
              Error
            </Badge>
            <p className="text-sm text-destructive">
              {errorMessage || "Something went wrong"}
            </p>
          </div>
        )}
        {state === "denied" && (
          <div className="flex flex-col items-center gap-2 py-8 text-center" role="alert" aria-live="polite">
            <Badge variant="warning" className="mb-2">
              Denied
            </Badge>
            <p className="text-sm text-warning-foreground">
              {deniedMessage || "Permission denied"}
            </p>
          </div>
        )}
        {isDefault && children && <>{children}</>}
      </CardContent>
    </Card>
  );
}

export { CardState };
export type { CardStateProps };
