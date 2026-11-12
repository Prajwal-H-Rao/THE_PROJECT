/**
 * Nova trips service - Itinerary draft (task 11.15, module 11).
 * Drafts one itinerary entry per local calendar day. Draft day times are
 * unconfirmed, so every entry carries an estimate label (spec:411).
 * Deterministic: same trip gives the same draft. No money moves here.
 */

import { civilKey, enumerateDays, tripBounds } from "./civil.ts";
import type { TripPlan } from "./types.ts";

export interface ItineraryDay {
  readonly dayIndex: number; // 1-based
  readonly date: string; // civil date YYYY-MM-DD in the trip timezone
  readonly marks: readonly string[]; // "arrival" and/or "departure"
  readonly summary: string;
  readonly estimateLabel: string; // always carries "estimate" (spec:411)
}

// Purpose: draft the day-by-day itinerary. First local day gets the arrival
// mark, last local day the departure mark; a one-day trip carries both.
export function draftItinerary(trip: TripPlan): readonly ItineraryDay[] {
  const [startCivil, endCivil] = tripBounds(trip);
  const days = enumerateDays(startCivil, endCivil);
  const total = days.length;
  return days.map((civil, index) => {
    const marks: string[] = [];
    if (index === 0) marks.push("arrival");
    if (index === total - 1) marks.push("departure");
    return {
      dayIndex: index + 1,
      date: civilKey(civil),
      marks,
      summary: `${trip.title} — day ${index + 1} of ${total} (draft)`,
      estimateLabel: "estimated",
    };
  });
}
