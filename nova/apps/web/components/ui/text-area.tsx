/**
 * Nova design system - TextArea component.
 * Provides textarea with label, error, hint, loading and empty states.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({
    className,
    label,
    error,
    hint,
    disabled,
    readOnly,
    loading,
    empty,
    emptyMessage,
    id,
    ...props
  }, ref) => {
    const textareaId = id || React.useId();
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint ? `${textareaId}-hint` : undefined;
    const emptyId = empty ? `${textareaId}-empty` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        {loading && (
          <div className="mb-2 flex items-center gap-2" role="status" aria-busy="true" aria-label="Loading">
            <Skeleton className="w-1/3 h-3" />
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        )}
        {empty && (
          <p id={emptyId} className="mt-1 text-sm text-muted-foreground" role="status">
            {emptyMessage || "No data available"}
          </p>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled || loading}
          readOnly={readOnly}
          aria-invalid={error ? "true" : "false"}
          aria-busy={loading ? "true" : "false"}
          aria-describedby={cn(errorId, hintId, emptyId)}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-muted",
            error && "border-destructive focus-visible:ring-destructive",
            loading && "opacity-50",
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {hint && !error && !loading && (
          <p id={hintId} className="mt-1.5 text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }
);
TextArea.displayName = "TextArea";

export { TextArea };
