/**
 * Nova design system - ApprovalRequiredState agent state.
 * Shows an honest approval-required state: the agent waits for user approval.
 */

"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ApprovalRequiredStateProps {
  message?: string;
  onApprove?: () => void;
  onReject?: () => void;
}

function ApprovalRequiredState({
  message,
  onApprove,
  onReject,
}: ApprovalRequiredStateProps) {
  return (
    <Card className="w-full border border-warning">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="warning" className="text-xs">
            Approval Required
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {message || "This action requires your approval before it can run."}
        </p>
        <div className="flex gap-2">
          {onApprove && (
            <Button variant="default" size="sm" onClick={onApprove}>
              Approve
            </Button>
          )}
          {onReject && (
            <Button variant="outline" size="sm" onClick={onReject}>
              Reject
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { ApprovalRequiredState };
export type { ApprovalRequiredStateProps };
