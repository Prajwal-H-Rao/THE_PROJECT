/**
 * Nova design system - VerifiedSuccessState agent state.
 * Shows an honest verified-success state: the verifier passed, action complete.
 * Never renders "done" before verification passes.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VerifiedSuccessStateProps {
  label?: string;
  message?: string;
  verifiedAt?: string;
}

function VerifiedSuccessState({ label, message, verifiedAt }: VerifiedSuccessStateProps) {
  return (
    <Card className="w-full border border-success">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {label && <Badge variant="success" className="text-xs">{label}</Badge>}
          {verifiedAt && (
            <span className="text-xs text-muted-foreground font-mono">
              {verifiedAt}
            </span>
          )}
        </div>
        {message && <p className="text-sm text-success-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}

export { VerifiedSuccessState };
export type { VerifiedSuccessStateProps };
