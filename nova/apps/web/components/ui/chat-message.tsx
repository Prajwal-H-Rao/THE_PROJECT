/**
 * Nova design system - ChatMessage component.
 * Renders a chat message with sender, content, timestamp and status.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  sender: "user" | "assistant" | "system";
  content: string;
  time?: string;
  status?: "sending" | "sent" | "failed" | "streaming";
}

function ChatMessage({
  sender,
  content,
  time,
  status,
}: ChatMessageProps) {
  const isUser = sender === "user";
  const statusText: Record<string, string> = {
    sending: "Sending…",
    sent: "Sent",
    failed: "Failed to send",
    streaming: "Streaming…",
  };

  return (
    <div className={cn("w-full mb-4 flex", isUser ? "flex-row-reverse" : "")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {content}
      </div>
      <div className={cn("w-[48px] flex items-end justify-between gap-1 mt-1", isUser ? "flex-row-reverse" : "")}>
        {time && (
          <span className="text-xs text-muted-foreground">{time}</span>
        )}
        {status && (
          <span className={cn("text-xs", status === "failed" ? "text-destructive" : "text-muted-foreground")}>
            {statusText[status]}
          </span>
        )}
      </div>
    </div>
  );
}

export { ChatMessage };
