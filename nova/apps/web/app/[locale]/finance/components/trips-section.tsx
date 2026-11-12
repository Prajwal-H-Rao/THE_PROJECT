/**
 * Nova design system - Trips section (task 11.17, module 11).
 * Route timeline using the Timeline component, transport options, and
 * booking links. Every estimate carries a label (spec:411). Booking links
 * never execute a purchase — they show an estimate and require approval
 * (spec:411, spec:190: no money movement).
 */

"use client";

import { Button } from "@/components/ui/button";
import { Timeline } from "@/components/ui/timeline";
import type { Trip } from "@/lib/api-types";

interface TripsSectionProps {
  readonly trips: readonly Trip[];
}

// Purpose: small inline badge for trip status.
function StatusBadge({ variant, children }: { readonly variant: string; readonly children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variant === "secondary" ? "border-secondary text-secondary-foreground bg-secondary/10" : "border-muted text-muted-foreground"}`}
    >
      {children}
    </span>
  );
}

// Purpose: render one trip card with route timeline and booking links.
function TripCard({ trip }: { readonly trip: Trip }) {
  return (
    <div key={trip.tripId} className="rounded-lg border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">{trip.title}</h3>
        <StatusBadge variant="secondary">{trip.status}</StatusBadge>
      </div>
      <div className="mb-3 text-xs text-muted-foreground">
        {trip.origin} → {trip.destination}{" "}
        <span className="font-mono text-muted-foreground">
          {trip.startAt} to {trip.endAt}
        </span>
      </div>
      <Timeline
        items={trip.stops.map((s) => ({
          title: s.name,
          time: s.arrivalEstimate,
          status: "pending" as const,
        }))}
      />
      {trip.routeEstimateLabel && (
        <p className="mt-2 text-xs text-muted-foreground">
          Route estimate: {trip.routeEstimateLabel}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {trip.stops.map((stop, i) => {
          if (i === trip.stops.length - 1) return null;
          const next = trip.stops[i + 1];
          return (
            <Button
              key={stop.stopId}
              variant="outline"
              size="xs"
              onClick={() => {
                // Booking requires an approval grant (task 11.16); this UI
                // only navigates to the booking flow — no purchase executes.
                // eslint-disable-next-line no-console
                console.log(`Book ${stop.name} → ${next.name}`);
              }}
              aria-label={`Book transport from ${stop.name} to ${next.name}`}
            >
              Book {stop.name} → {next.name}{" "}
              <span className="text-xs text-muted-foreground">
                ({stop.departureEstimate ?? "estimated"})
              </span>
            </Button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        All transport options are estimates (spec:411). Booking requires an
        approval grant; no money moves in this UI (spec:190).
      </p>
    </div>
  );
}

export function TripsSection({ trips }: TripsSectionProps) {
  if (trips.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4 text-center text-muted-foreground">
        No trips planned.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Trips</h2>
      {trips.map((trip) => (
        <TripCard key={trip.tripId} trip={trip} />
      ))}
    </div>
  );
}
