/**
 * Nova design system - Shell header.
 * Header bar for the app shell: app name, theme switcher, status, audit link.
 * All user-facing labels come from props (no hardcoded text).
 */

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { cn } from "@/lib/utils";

interface ShellHeaderProps {
  appName?: string;
  status?: "online" | "offline" | "degraded";
  onAudit?: () => void;
  /** Optional command palette slot, self-configured by the caller. */
  palette?: React.ReactNode;
  /** Optional user menu slot, self-configured by the caller. */
  userMenu?: React.ReactNode;
}

function ShellHeader({
  appName,
  status = "online",
  onAudit,
  palette,
  userMenu,
}: ShellHeaderProps) {
  return (
    <header
      data-slot="shell-header"
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-card flex-wrap"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {appName && (
          <span className="text-sm font-semibold text-foreground truncate">
            {appName}
          </span>
        )}
        <ThemeSwitcher />
      </div>
      <div className="flex items-center gap-2">
        {palette}
        {userMenu}
        <Badge
          variant={status === "online" ? "success" : "warning"}
          className="text-xs"
        >
          {status}
        </Badge>
        {onAudit && (
          <Button
            variant="outline"
            size="icon"
            onClick={onAudit}
            aria-label="Open audit log"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h2m-9 4h2m-9 4h2m7-4h2m7 4h2m-2-4h2m-2-4h2m2-12V6a2 2 0 012-2h6a2 2 0 012 2v6m0 0v3a2 2 0 01-2 2H9a2 2 0 01-2-2V6z"
              />
            </svg>
          </Button>
        )}
      </div>
    </header>
  );
}

export { ShellHeader };
export type { ShellHeaderProps };
