/**
 * Nova design system - FailedUncertainState agent state.
 * Shows an honest failed/uncertain state: the action did not complete reliably.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FailedUncertainStateProps {
  label?: string;
  message?: string;
  reason?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

function FailedUncertainState({
  label,
  message,
  reason,
  retryLabel,
  onRetry,
}: FailedUncertainStateProps) {
  return (
    <Card className="w-full border border-destructive">
      <CardContent className="p-4">
        {label && (
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="destructive" className="text-xs">{label}</Badge>
          </div>
        )}
        {message && <p className="text-sm text-destructive mb-2">{message}</p>}
        {reason && (
          <p className="text-xs text-muted-foreground mb-4">{reason}</p>
        )}
        <div className="flex gap-2">
          {onRetry && retryLabel && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { FailedUncertainState };
export type { FailedUncertainStateProps };
