/**
 * Nova design system - Timeline component.
 * Provides vertical timeline with steps and states.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TimelineItemProps {
  title: string;
  description?: string;
  time?: string;
  status?: "pending" | "success" | "error" | "active";
  children?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItemProps[];
}

function TimelineItem({
  title,
  description,
  time,
  status = "pending",
  children,
}: TimelineItemProps) {
  const statusStyles: Record<string, string> = {
    pending: "text-muted-foreground border-muted",
    success: "text-green text-green-foreground border-green",
    error: "text-destructive border-destructive",
    active: "text-primary border-primary",
  };
  return (
    <li className="relative pl-8 pb-6 last:pb-0">
      <div className="absolute left-0 top-1 h-1 w-1 rounded-full border-2">
        <span className={`flex h-2 w-2 items-center justify-center rounded-full border-2 bg-background ${statusStyles[status]}`} />
      </div>
      <div className="flex items-start space-x-3">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          {time && <span className="text-xs text-muted-foreground">{time}</span>}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="mt-2">{children}</div>}
    </li>
  );
}

function Timeline({ items }: TimelineProps) {
  return (
    <ul className="relative border-l border-border pl-4">
      {items.map((item, i) => (
        <TimelineItem key={i} {...item} />
      ))}
    </ul>
  );
}

export { Timeline, TimelineItem };
