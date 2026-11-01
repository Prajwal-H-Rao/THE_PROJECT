/**
 * Nova design system - FailedUncertainState agent state.
 * Shows an honest failed/uncertain state: the action did not complete reliably.
 */

"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FailedUncertainStateProps {
  message?: string;
  reason?: string;
  onRetry?: () => void;
}

function FailedUncertainState({
  message,
  reason,
  onRetry,
}: FailedUncertainStateProps) {
  return (
    <Card className="w-full border border-destructive">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="destructive" className="text-xs">
            Failed / Uncertain
          </Badge>
        </div>
        <p className="text-sm text-destructive mb-2">
          {message || "The action could not be completed reliably."}
        </p>
        {reason && (
          <p className="text-xs text-muted-foreground mb-4">
            {reason}
          </p>
        )}
        <div className="flex gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { FailedUncertainState };
export type { FailedUncertainStateProps };
