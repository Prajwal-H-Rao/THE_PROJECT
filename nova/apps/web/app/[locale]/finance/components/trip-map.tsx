/**
 * Nova design system - Trip map (task 11.17, module 11).
 * Simple SVG-based route map: stops rendered as connected points with
 * labels. No external map library. Stop order is preserved along the
 * route line (spec:411: estimates carry labels, not confirmed times).
 */

"use client";

import type { TripStop } from "@/lib/api-types";

interface TripMapProps {
  readonly stops: readonly TripStop[];
}

// Purpose: compute evenly spaced x positions along the route line.
function stopX(index: number, total: number): number {
  if (total <= 1) return 50;
  return 50 + (index / (total - 1)) * 90; // 5% to 95% width
}

export function TripMap({ stops }: TripMapProps) {
  if (stops.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4 text-center text-muted-foreground">
        No route stops.
      </div>
    );
  }
  const points = stops.map((s, i) => ({
    x: stopX(i, stops.length),
    y: i % 2 === 0 ? 30 : 70, // alternate above/below line
  }));
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Route map</h2>
      <div className="relative h-48 w-full">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={linePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="currentColor"
              tabIndex={0}
              role="button"
              aria-label={stops[i].name}
            />
          ))}
        </svg>
        <div className="absolute -top-8 left-0 w-full flex justify-between text-xs text-muted-foreground">
          {stops.map((s, i) => (
            <span key={i} className="text-center w-[12%]">
              {s.name} {i === 0 ? "• Start" : i === stops.length - 1 ? "• End" : ""}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Stop times are labelled estimates (spec:411); confirmed only at
        booking with an approval grant.
      </p>
    </div>
  );
}
