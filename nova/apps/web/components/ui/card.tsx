/**
 * Nova design system - Card component.
 * Provides container with header, content and footer regions.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-header" className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 data-slot="card-title" className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-footer" className={cn("flex items-center p-6 pt-0", className)} {...props} />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
