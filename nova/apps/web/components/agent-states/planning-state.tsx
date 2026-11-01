/**
 * Nova design system - PlanningState agent state.
 * Shows an honest planning state: the agent is thinking, no result yet.
 */

"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PlanningStateProps {
  message?: string;
}

function PlanningState({ message }: PlanningStateProps) {
  return (
    <Card className="w-full border border-info">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Badge variant="info" className="text-xs">
            Planning
          </Badge>
          <p className="text-sm text-muted-foreground">
            {message || "Planning your request…"}
          </p>
        </div>
        <div className="mt-2 flex gap-2">
          <Skeleton className="w-1/3 h-3" />
          <Skeleton className="w-1/2 h-3" />
          <Skeleton className="w-1/4 h-3" />
        </div>
      </CardContent>
    </Card>
  );
}

export { PlanningState };
export type { PlanningStateProps };
