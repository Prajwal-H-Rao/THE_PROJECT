/**
 * Nova design system - PageLayout layout.
 * Responsive page shell: sidebar collapses below 1024px, header stacks below 640px.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
}

function PageLayout({ children, sidebar, header }: PageLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      {header && <header className="flex-shrink-0">{header}</header>}
      <div className="flex-1 flex min-h-0">
        {sidebar && (
          <aside
            className={cn(
              "hidden lg:flex flex-col flex-shrink-0 w-[280px] border-r",
              "border-border"
            )}
          >
            {sidebar}
          </aside>
        )}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export { PageLayout };
export type { PageLayoutProps };
