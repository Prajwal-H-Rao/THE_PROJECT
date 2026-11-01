/**
 * Nova design system - TaskCard domain variant.
 * Renders a task domain card in one of five states via CardState.
 * All user-facing text comes from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CardState } from "@/components/ui/card-state";

interface TaskCardProps {
  state: "default" | "loading" | "empty" | "error" | "denied";
  emptyMessage?: string;
  errorMessage?: string;
  deniedMessage?: string;
  title?: string;
  due?: string;
  priority?: "low" | "medium" | "high";
}

function priorityClass(p: "low" | "medium" | "high"): string {
  switch (p) {
    case "low":
      return "bg-muted text-muted-foreground";
    case "medium":
      return "bg-warning text-white";
    case "high":
      return "bg-destructive text-white";
  }
}

function TaskCard({
  state,
  emptyMessage,
  errorMessage,
  deniedMessage,
  title,
  due,
  priority,
}: TaskCardProps) {
  return (
    <CardState
      state={state}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      deniedMessage={deniedMessage}
    >
      <div className="flex flex-col gap-2">
        {title && <h4 className="text-sm font-semibold text-foreground">{title}</h4>}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {due && <span className="mr-2">Due: {due}</span>}
          {priority && (
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", priorityClass(priority))}>
              {priority}
            </span>
          )}
        </div>
      </div>
    </CardState>
  );
}

export { TaskCard };
export type { TaskCardProps };
