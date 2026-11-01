/**
 * Nova design system - Combobox component.
 * Provides a searchable select with keyboard navigation and ARIA support.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  readOnly?: boolean;
  noResultsMessage?: string;
}

function ComboboxImpl({
  options,
  value,
  onChange,
  placeholder,
  label,
  error,
  hint,
  disabled,
  readOnly,
  noResultsMessage,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const highlightedRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [search, isOpen]);

  React.useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const selectedOption = options.find((o) => o.value === value);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || readOnly) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          onChange?.(filteredOptions[highlightedIndex].value);
          setSearch("");
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearch("");
        inputRef.current?.blur();
        break;
    }
  };

  const selectOption = (optValue: string) => {
    if (disabled || readOnly) return;
    onChange?.(optValue);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={readOnly && selectedOption ? selectedOption.label : search || (selectedOption ? selectedOption.label : "")}
          onChange={(e) => {
            if (disabled || readOnly) return;
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled && !readOnly && options.length) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={!selectedOption ? placeholder : undefined}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error ? "true" : "false"}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className={cn(
            "flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 read-only:bg-muted",
            error ? "border-destructive focus-visible:ring-destructive" : "border-input"
          )}
        />
        {isOpen && !disabled && !readOnly && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {noResultsMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  ref={(el) => {
                    if (index === highlightedIndex) highlightedRef.current = el;
                  }}
                  role="option"
                  aria-selected={value === option.value}
                  aria-disabled={option.disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => !option.disabled && selectOption(option.value)}
                  className={cn(
                    "cursor-pointer px-3 py-1.5 text-sm",
                    index === highlightedIndex && "bg-accent text-accent-foreground",
                    option.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export const Combobox = React.forwardRef<HTMLDivElement, ComboboxProps>(
  (props, ref) => <div ref={ref as any}><ComboboxImpl {...props} /></div>
);
Combobox.displayName = "Combobox";
