/**
 * Nova trips service - Test fixtures (task 11.15, module 11).
 * Shared deterministic trip fixture for the itinerary, packing and
 * checklist test files. Kept out of the test files themselves so importing
 * it does not re-run another file's test suite.
 */

import type { TripPlan } from "./types.ts";

// Purpose: a fixed three-day trip used as the base fixture.
export const BASE_TRIP: TripPlan = {
  title: "Team offsite",
  startAt: "2026-03-10T09:00:00Z",
  endAt: "2026-03-12T18:00:00Z",
  timezone: "UTC",
  status: "planned",
};
