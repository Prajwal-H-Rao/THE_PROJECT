/**
 * Nova design system - ExecutingState agent state.
 * Shows an honest executing state: the agent is running an action.
 */

"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ExecutingStateProps {
  message?: string;
  action?: string;
}

function ExecutingState({ message, action }: ExecutingStateProps) {
  return (
    <Card className="w-full border border-primary">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="info" className="text-xs">
            Executing
          </Badge>
          {action && <span className="text-xs text-muted-foreground">{action}</span>}
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {message || "Running the selected action…"}
        </p>
        <div className="flex gap-2">
          <Skeleton className="w-1/2 h-3" />
          <Skeleton className="w-1/3 h-3" />
        </div>
      </CardContent>
    </Card>
  );
}

export { ExecutingState };
export type { ExecutingStateProps };
