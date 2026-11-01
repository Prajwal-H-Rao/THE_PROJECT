/**
 * Nova design system - User menu.
 * Avatar trigger plus dropdown menu. Keyboard contract: Escape closes
 * and focus returns to the trigger, arrows navigate, first letter
 * jumps to an item. All labels come from props.
 */

"use client";

import * as React from "react";
import { DropdownMenu } from "radix-ui";
import { cn } from "@/lib/utils";

interface UserMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  /** Marks an irreversible action; styled with the danger token. */
  danger?: boolean;
}

interface UserMenuProps {
  /** Accessible name for the trigger button. */
  triggerLabel: string;
  /** Short initials rendered inside the avatar circle. */
  initials: string;
  /** Display name shown at the top of the open menu. */
  userLabel: string;
  /** Optional detail line, for example the account email. */
  userDetail?: string;
  items: UserMenuItem[];
}

// Menu items and identity text are caller-owned; nothing is hardcoded here.
function UserMenu({ triggerLabel, initials, userLabel, userDetail, items }: UserMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        type="button"
        data-slot="user-menu-trigger"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={triggerLabel}
      >
        {initials}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-slot="user-menu-content"
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 rounded-lg border border-border bg-card p-1 shadow-md"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-foreground">{userLabel}</p>
            {userDetail && <p className="text-xs text-muted-foreground">{userDetail}</p>}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.id}
              onSelect={item.onSelect}
              className={cn(
                // Radix supplies focus highlight; data-highlighted styles it.
                "rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent",
                item.danger ? "text-destructive" : "text-foreground"
              )}
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export { UserMenu };
export type { UserMenuItem, UserMenuProps };
