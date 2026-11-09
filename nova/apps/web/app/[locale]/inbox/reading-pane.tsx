/**
 * Nova design system - Inbox reading pane (task 09.18, module 09).
 * Shows one selected message with three distinct labelled sections so
 * summaries stay distinguishable from the original message and quoted
 * text (spec:407). Keeps its own source label, freshness line and
 * action controls per pane.
 */

"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface InboxMessage {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  body: string;
  quoted?: string;
  folder: "inbox" | "archive";
  unread: boolean;
}

interface ReadingPaneProps {
  message: InboxMessage;
  folderSource: string;
  onMarkRead: () => void;
  onArchive: () => void;
  onBack: () => void;
}

function freshnessNow(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReadingPane({
  message,
  folderSource,
  onMarkRead,
  onArchive,
  onBack,
}: ReadingPaneProps) {
  const retrievedAt = freshnessNow();

  return (
    <section
      data-testid="reading-pane"
      aria-label="Reading pane"
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 flex-1 min-w-0"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-foreground">{message.subject}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span data-testid="reading-source">Source: {folderSource}</span>
            <span>•</span>
            <span data-testid="reading-freshness">Retrieved {retrievedAt}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={message.unread ? "warning" : "secondary"} size="sm">
            {message.unread ? "Unread" : "Read"}
          </Badge>
          <Button variant="outline" size="sm" onClick={onMarkRead}>
            Mark as read
          </Button>
          <Button variant="destructive" size="sm" onClick={onArchive}>
            Archive message
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground">Summary:</h4>
          <p className="text-sm text-foreground">{message.snippet}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground">Original:</h4>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {message.body}
          </p>
        </div>
        {message.quoted && (
          <div className="bg-muted/20 rounded p-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Quoted:</h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">{message.quoted}</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={onBack} className="lg:hidden">
          Back to list
        </Button>
      </div>
    </section>
  );
}
