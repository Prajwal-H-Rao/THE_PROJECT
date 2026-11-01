/**
 * Nova design system - ResponsiveContainer layout.
 * Applies max-width at each responsive breakpoint: 640, 768, 1024, 1280, 1536.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function ResponsiveContainer({ className, ...props }: ResponsiveContainerProps) {
  return (
    <div
      data-slot="responsive-container"
      className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl",
        className
      )}
      {...props}
    />
  );
}

export { ResponsiveContainer };
export type { ResponsiveContainerProps };
