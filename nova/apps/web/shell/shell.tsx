/**
 * Nova design system - App shell root.
 * Composes PageLayout with shell-header and shell-nav slots. Domain modules
 * own page bodies and nav items. All labels come from props.
 */

"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { ShellHeader } from "@/shell/shell-header";
import { ShellNav, type ShellNavItem } from "@/shell/shell-nav";

interface ShellProps {
  appName?: string;
  status?: "online" | "offline" | "degraded";
  navItems?: ShellNavItem[];
  onAudit?: () => void;
  onItemClick?: (item: ShellNavItem) => void;
  /** Command palette node, forwarded to the header. */
  palette?: React.ReactNode;
  /** User menu node, forwarded to the header. */
  userMenu?: React.ReactNode;
  children: React.ReactNode;
}

function Shell({
  appName,
  status,
  navItems,
  onAudit,
  onItemClick,
  palette,
  userMenu,
  children,
}: ShellProps) {
  return (
    <PageLayout
      header={
        <ShellHeader
          appName={appName}
          status={status}
          onAudit={onAudit}
          palette={palette}
          userMenu={userMenu}
        />
      }
      sidebar={
        navItems && navItems.length ? (
          <ShellNav items={navItems} onItemClick={onItemClick} />
        ) : undefined
      }
    >
      {children}
    </PageLayout>
  );
}

export { Shell };
export type { ShellProps };
