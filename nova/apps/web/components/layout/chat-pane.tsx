/**
 * Nova design system - ChatPane layout.
 * Chat layout usable at 320px minimum width. Approval details stay visible.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";

interface ChatPaneProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function ChatPane({ className, ...props }: ChatPaneProps) {
  return (
    <div
      data-slot="chat-pane"
      className={cn(
        "min-w-[320px] max-w-[768px] w-full flex flex-col h-full",
        className
      )}
      {...props}
    />
  );
}

interface ChatMessageBubbleProps {
  sender: "user" | "assistant";
  content: string;
}

function ChatMessageBubble({ sender, content }: ChatMessageBubbleProps) {
  const isUser = sender === "user";
  return (
    <div className={cn("w-full mb-2", isUser ? "flex-row-reverse" : "")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}
      >
        {content}
      </div>
    </div>
  );
}

export { ChatPane, ChatMessageBubble };
export type { ChatPaneProps, ChatMessageBubbleProps };
