"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActionPreviewProps {
  /** The tool name being called */
  tool: string;
  /** The exact arguments that will be passed */
  arguments: Record<string, unknown>;
  /** The permissions required for this action */
  permissions: string[];
  /** Side effects that will occur */
  sideEffects: string[];
  /** Whether the action is reversible */
  reversible: boolean;
  /** Expiry timestamp for the approval grant */
  expiry: Date;
  /** Policy rationale from the decision engine */
  rationale: string;
  /** Callback when user approves */
  onApprove: () => void;
  /** Callback when user rejects */
  onReject: () => void;
  /** Callback when user edits */
  onEdit?: () => void;
  /** Whether the preview is in a loading state */
  loading?: boolean;
}

export function ActionPreview({
  tool,
  arguments: args,
  permissions,
  sideEffects,
  reversible,
  expiry,
  rationale,
  onApprove,
  onReject,
  onEdit,
  loading = false,
}: ActionPreviewProps) {
  const formatExpiry = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / 60000);
    if (diffMins <= 0) return "Expired";
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.ceil(diffMins / 60);
    return `${diffHours} hr`;
  };

  const formatArgs = (obj: Record<string, unknown>) => {
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(", ");
  };

  return (
    <Card className="w-full max-w-md border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Action Preview</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {tool}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Arguments */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Arguments</p>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto tabular-nums">
            {formatArgs(args)}
          </pre>
        </div>

        {/* Permissions */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Required Permissions</p>
          <div className="flex flex-wrap gap-1">
            {permissions.map((p, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {p}
              </Badge>
            ))}
          </div>
        </div>

        {/* Side Effects */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Side Effects</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {sideEffects.map((effect, i) => (
              <li key={i} className="flex items-start gap-1">
                <span aria-hidden="true">→</span>
                <span>{effect}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Reversibility */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Reversible:</span>
          <Badge variant={reversible ? "success" : "warning"}>
            {reversible ? "Yes" : "No — irreversible"}
          </Badge>
        </div>

        {/* Expiry */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Grant expires:</span>
          <span className="font-mono tabular-nums">{formatExpiry(expiry)}</span>
        </div>

        {/* Policy Rationale */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Policy Rationale</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{rationale}</p>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-2 pt-2 border-t"
          role="group"
          aria-label="Action preview controls"
        >
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={loading}
              aria-label="Edit action"
            >
              Edit
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={onReject}
            disabled={loading}
            aria-label="Reject action"
          >
            Reject
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onApprove}
            disabled={loading}
            className="ml-auto"
            aria-label="Approve action"
          >
            {loading ? "Approving…" : "Approve"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}