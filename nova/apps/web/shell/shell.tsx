/**
 * Nova design system - App shell root.
 * Composes PageLayout with shell-header and shell-nav slots. Domain modules
 * own page bodies and nav items. All labels come from props.
 */

"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { ShellHeader } from "@/shell/shell-header";
import { ShellNav } from "@/shell/shell-nav";

interface ShellProps {
  appName?: string;
  status?: "online" | "offline" | "degraded";
  navItems?: React.ComponentProps<typeof ShellNav>["items"];
  onAudit?: () => void;
  children: React.ReactNode;
}

function Shell({
  appName,
  status,
  navItems,
  onAudit,
  children,
}: ShellProps) {
  return (
    <PageLayout
      header={<ShellHeader appName={appName} status={status} onAudit={onAudit} />}
      sidebar={
        navItems && navItems.length ? (
          <ShellNav items={navItems} />
        ) : undefined
      }
    >
      {children}
    </PageLayout>
  );
}

export { Shell };
export type { ShellProps };
