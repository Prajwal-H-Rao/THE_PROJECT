/**
 * Nova design system - Toast component.
 * Shows a toast notification with title, description and close action.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  onClose?: () => void;
  action?: React.ReactNode;
}

function Toast({
  title,
  description,
  variant = "default",
  onClose,
  action,
}: ToastProps) {
  return (
    <div
      className={cn(
        "flex items-center w-full rounded-md border p-4 shadow-lg",
        variant === "destructive"
          ? "border-destructive bg-destructive text-white"
          : "border-border bg-background text-foreground"
      )}
    >
      <div className="flex-1 space-y-1">
        {title && <h3 className="text-sm font-semibold">{title}</h3>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="ml-auto">{action}</div>}
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-muted-foreground hover:text-foreground"
          aria-label="Close toast"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export { Toast };
