/**
 * Nova design system - ApprovalCard component.
 * Shows an action awaiting approval with hash, expiry and consequence.
 */

"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ApprovalCardProps {
  tool: string;
  hash: string;
  expiry: Date;
  consequence: string;
  onApprove: () => void;
  onReject: () => void;
}

function ApprovalCard({
  tool,
  hash,
  expiry,
  consequence,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const formatExpiry = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / 60000);
    if (diffMins <= 0) return "Expired";
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.ceil(diffMins / 60);
    return `${diffHours} hr`;
  };

  return (
    <Card className="w-full max-w-lg border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {tool}
          </Badge>
          Approval Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Action hash:</span>
          <code className="font-mono truncate max-w-xs">{hash}</code>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Expires:</span>
          <span className="font-mono">{formatExpiry(expiry)}</span>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Consequence:</p>
          <p className="text-sm text-muted-foreground">{consequence}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReject}>
            Reject
          </Button>
          <Button variant="default" size="sm" onClick={onApprove}>
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { ApprovalCard };
