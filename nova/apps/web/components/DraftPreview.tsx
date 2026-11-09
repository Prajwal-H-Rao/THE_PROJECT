/**
 * Nova design system - Draft Preview surface (task 09.8, module 09).
 * Renders a draft email's exact payload (to, subject, body) before sending.
 * The preview shows the same payload that will be sent — no transformation,
 * no hidden fields. "Preview equals the send payload."
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DraftPreviewProps {
  /** Draft document ID */
  draftId: string;
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Email body text */
  body: string;
  /** Callback when user clicks Send — receives draftId, grantNonce, payload, target */
  onSend: (
    draftId: string,
    grantNonce: string,
    payload: { to: string; subject: string; body: string },
    target: string,
  ) => Promise<void> | void;
  /** Callback when user clicks Cancel */
  onCancel: () => void;
  /** Approval grant nonce for sending */
  grantNonce: string;
  /** Target resource reference for the send */
  target: string;
  /** Loading state for the send button */
  loading?: boolean;
}

export function DraftPreview({
  draftId,
  to,
  subject,
  body,
  onSend,
  onCancel,
  grantNonce,
  target,
  loading = false,
}: DraftPreviewProps) {
  return (
    <Card className="w-full max-w-lg border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Draft Preview</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* To */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">To</p>
          <p className="text-sm text-foreground break-all">{to}</p>
        </div>

        {/* Subject */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Subject</p>
          <p className="text-sm font-medium text-foreground break-all">{subject}</p>
        </div>

        {/* Body */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Body</p>
          <pre className="text-sm text-foreground whitespace-pre-wrap break-words bg-muted p-3 rounded-md">
            {body}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
            aria-label="Cancel draft"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() =>
              onSend(draftId, grantNonce, { to, subject, body }, target)
            }
            disabled={loading}
            className="ml-auto"
            aria-label="Send draft"
          >
            {loading ? "Sending…" : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
