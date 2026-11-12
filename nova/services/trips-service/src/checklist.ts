/**
 * Nova trips service - Pre-departure checklist (task 11.15, module 11).
 * Builds a deterministic pre-departure checklist from the trip start.
 * Each item pins a civil-day offset before startAt and a phase. Due dates
 * come from civil subtraction, so DST transitions cannot shift them
 * (spec:826). No clock reads; a draft is always not-done.
 */

import { civilDateOf, civilKey, shiftCivil, toInstantMs } from "./civil.ts";
import type { TripPlan } from "./types.ts";

export type ChecklistPhase = "weeks-before" | "days-before" | "day-of";

export interface ChecklistItem {
  readonly label: string;
  readonly phase: ChecklistPhase;
  readonly offsetDays: number; // civil days before startAt
  readonly dueDate: string; // civil date YYYY-MM-DD
  readonly done: boolean; // always false in a draft
}

// Purpose: checklist template. Each item pins a civil-day offset before
// startAt and its phase; offsets are calendar arithmetic, not ms deltas.
const CHECKLIST_TEMPLATE: readonly {
  label: string;
  offsetDays: number;
  phase: ChecklistPhase;
}[] = [
  { label: "Check passport validity and visa needs", offsetDays: 14, phase: "weeks-before" },
  { label: "Confirm bookings and check-in times", offsetDays: 7, phase: "weeks-before" },
  { label: "Arrange transport to the station or airport", offsetDays: 2, phase: "days-before" },
  { label: "Pack bags against the packing list", offsetDays: 1, phase: "days-before" },
  { label: "Charge devices and download offline maps", offsetDays: 0, phase: "day-of" },
  { label: "Set out-of-office and stop deliveries", offsetDays: 0, phase: "day-of" },
];

// Purpose: build the pre-departure checklist. Items sort by due date,
// earliest first.
export function buildPreDepartureChecklist(
  trip: TripPlan,
): readonly ChecklistItem[] {
  const startMs = toInstantMs(trip.startAt);
  const startCivil = civilDateOf(startMs, trip.timezone);
  const items = CHECKLIST_TEMPLATE.map((entry) => ({
    label: entry.label,
    phase: entry.phase,
    offsetDays: entry.offsetDays,
    dueDate: civilKey(shiftCivil(startCivil, -entry.offsetDays)),
    done: false,
  }));
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
