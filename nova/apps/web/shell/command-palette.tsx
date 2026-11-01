/**
 * Nova design system - Command palette.
 * Keyboard-driven action launcher built on the Dialog primitive.
 * Mod+K toggles it. Arrow keys move the active item, Enter runs it,
 * Escape closes. All user-facing labels come from props.
 */

"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommandAction {
  id: string;
  label: string;
  /** Extra match text for the filter. Not rendered. */
  keywords?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  /** Visible trigger label (opens the palette). */
  triggerLabel: string;
  /** Accessible name for the dialog and the list. */
  title: string;
  /** Placeholder for the filter field. */
  searchPlaceholder: string;
  /** Text shown when the filter matches nothing. */
  noResultsLabel: string;
  actions: CommandAction[];
}

// Filter keeps the active row inside the list; the caller supplies the actions.
function CommandPalette({
  triggerLabel,
  title,
  searchPlaceholder,
  noResultsLabel,
  actions,
}: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Mod+K toggles the palette. preventDefault stops the browser find shortcut.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter((action) =>
      `${action.label} ${action.keywords ?? ""}`.toLowerCase().includes(needle)
    );
  }, [actions, query]);

  // New query resets the cursor to the first row.
  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Run closes first so focus returns to the trigger before the action moves it.
  function runAction(action: CommandAction) {
    setOpen(false);
    action.onSelect();
  }

  // Keyboard contract on the field: arrows cycle, Enter runs the active row.
  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (filtered.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % filtered.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + filtered.length) % filtered.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const action = filtered[activeIndex];
      if (action) runAction(action);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        // Clear the filter so the next open shows the full action list.
        if (!value) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="border-b border-border">
          <input
            type="text"
            className="w-full bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
        <ul
          role="listbox"
          aria-label={title}
          className="max-h-64 overflow-y-auto p-1"
        >
          {filtered.length === 0 && (
            <li role="option" aria-selected={false} aria-disabled className="px-3 py-2 text-sm text-muted-foreground">
              {noResultsLabel}
            </li>
          )}
          {filtered.map((action, index) => (
            <li key={action.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  index === activeIndex && "bg-accent"
                )}
                // Hover and focus both lift the cursor so keyboard and
                // pointer stay in step.
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onClick={() => runAction(action)}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export { CommandPalette };
export type { CommandAction, CommandPaletteProps };
