/**
 * Nova design system - ApprovalRequiredState agent state.
 * Shows an honest approval-required state: the agent waits for user approval.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ApprovalRequiredStateProps {
  label?: string;
  message?: string;
  approveLabel?: string;
  rejectLabel?: string;
  onApprove?: () => void;
  onReject?: () => void;
}

function ApprovalRequiredState({
  label,
  message,
  approveLabel,
  rejectLabel,
  onApprove,
  onReject,
}: ApprovalRequiredStateProps) {
  return (
    <Card className="w-full border border-warning">
      <CardContent className="p-4">
        {label && (
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="warning" className="text-xs">{label}</Badge>
          </div>
        )}
        {message && (
          <p className="text-sm text-muted-foreground mb-4">{message}</p>
        )}
        <div className="flex gap-2">
          {onApprove && approveLabel && (
            <Button variant="default" size="sm" onClick={onApprove}>
              {approveLabel}
            </Button>
          )}
          {onReject && rejectLabel && (
            <Button variant="outline" size="sm" onClick={onReject}>
              {rejectLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { ApprovalRequiredState };
export type { ApprovalRequiredStateProps };
