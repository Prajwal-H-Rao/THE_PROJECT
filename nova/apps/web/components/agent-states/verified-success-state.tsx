/**
 * Nova design system - VerifiedSuccessState agent state.
 * Shows an honest verified-success state: the verifier passed, action complete.
 * Never renders "done" before verification passes.
 */

"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VerifiedSuccessStateProps {
  message?: string;
  verifiedAt?: string;
}

function VerifiedSuccessState({ message, verifiedAt }: VerifiedSuccessStateProps) {
  return (
    <Card className="w-full border border-success">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="success" className="text-xs">
            Verified Success
          </Badge>
          {verifiedAt && (
            <span className="text-xs text-muted-foreground font-mono">
              {verifiedAt}
            </span>
          )}
        </div>
        <p className="text-sm text-success-foreground">
          {message || "Action verified and complete."}
        </p>
      </CardContent>
    </Card>
  );
}

export { VerifiedSuccessState };
export type { VerifiedSuccessStateProps };
