/**
 * Nova design system - Shell navigation.
 * Navigation items for the app shell. Labels and paths come from props;
 * domain modules own their nav items.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ShellNavItem {
  label: string;
  href: string;
  active?: boolean;
}

interface ShellNavProps {
  items: ShellNavItem[];
  onItemClick?: (item: ShellNavItem) => void;
}

function ShellNav({ items, onItemClick }: ShellNavProps) {
  return (
    <nav
      data-slot="shell-nav"
      className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0"
      aria-label="Main navigation"
    >
      {items.map((item, index) => (
        <Button
          key={item.href}
          variant={item.active ? "default" : "ghost"}
          size="sm"
          onClick={() => onItemClick?.(item)}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "whitespace-nowrap",
            item.active ? "bg-background shadow-sm" : ""
          )}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}

export { ShellNav };
export type { ShellNavProps, ShellNavItem };
