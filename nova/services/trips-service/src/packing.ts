/**
 * Nova trips service - Packing list (task 11.15, module 11).
 * Builds a deterministic packing list from the trip's day count. Base
 * items are always present; clothing quantities scale one-per-day up to
 * fixed caps; extras appear at fixed day-count thresholds. Same input,
 * same list. No money moves here.
 */

import { enumerateDays, tripBounds } from "./civil.ts";
import type { TripPlan } from "./types.ts";

export interface PackingItem {
  readonly name: string;
  readonly quantity: number; // integer count, capped
}

// Purpose: base packing items present on every trip.
const BASE_PACKING: readonly string[] = [
  "passport",
  "phone charger",
  "toiletry kit",
];

// Purpose: fixed quantity caps so long trips never produce runaway counts.
const PACKING_CAPS: Readonly<Record<string, number>> = {
  shirts: 7,
  underwear: 10,
  socks: 10,
};

// Purpose: build the packing list for the trip's local day count.
export function buildPackingList(trip: TripPlan): readonly PackingItem[] {
  const [startCivil, endCivil] = tripBounds(trip);
  const dayCount = enumerateDays(startCivil, endCivil).length;
  const items: PackingItem[] = BASE_PACKING.map((name) => ({ name, quantity: 1 }));
  for (const [name, cap] of Object.entries(PACKING_CAPS)) {
    items.push({ name, quantity: Math.min(dayCount, cap) });
  }
  if (dayCount >= 3) items.push({ name: "laundry bag", quantity: 1 });
  if (dayCount >= 7) items.push({ name: "travel laundry detergent", quantity: 1 });
  return items;
}
