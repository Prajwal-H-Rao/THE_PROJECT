/**
 * Nova trips service - Civil calendar helpers.
 * Converts trip instants to local civil dates and runs calendar arithmetic
 * on Y/M/D components in a timezone-free civil domain. Instants are read
 * only at the Intl boundary; day math never steps instants by epoch ms, so
 * DST transitions cannot drop or shift a day (spec:826).
 */

import type { TripInstant, TripPlan } from "./types.ts";

/** Hard cap on enumerated days; blocks runaway corrupt rows. */
export const MAX_TRIP_DAYS = 365;

export interface CivilDate {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number; // 1-31
}

// Purpose: resolve a trip instant to epoch ms. Rejects offset-less ISO
// strings with a fixed message; their parse result is host-timezone
// dependent and would break determinism.
export function toInstantMs(value: TripInstant): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  // Offset-qualified only: trailing Z or +/-HH:MM.
  if (/(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    const ms = Date.parse(value);
    if (!Number.isNaN(ms)) return ms;
  }
  throw new RangeError(
    `startAt/endAt must be epoch ms, a Date, or an offset-qualified ISO string: ${value}`,
  );
}

// Purpose: convert an instant to the civil date in a timezone. An invalid
// timezone deterministically falls back to UTC (Intl throws RangeError).
export function civilDateOf(ms: number, timezone: string): CivilDate {
  let tz = timezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    tz = "UTC"; // invalid IANA name: fixed fallback, never host-dependent
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (name: string): number =>
    Number(parts.find((p) => p.type === name)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

// Purpose: format a civil date as a YYYY-MM-DD key.
export function civilKey(d: CivilDate): string {
  const mm = String(d.month).padStart(2, "0");
  const dd = String(d.day).padStart(2, "0");
  return `${d.year}-${mm}-${dd}`;
}

// Purpose: shift a civil date by n calendar days via timezone-free civil
// arithmetic (Date.UTC on Y/M/D). DST never enters this domain.
export function shiftCivil(d: CivilDate, days: number): CivilDate {
  const shifted = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

// Purpose: resolve trip bounds to civil dates; clamp endAt <= startAt to a
// one-day trip. Returns [startCivil, endCivil] inclusive.
export function tripBounds(trip: TripPlan): readonly [CivilDate, CivilDate] {
  const startMs = toInstantMs(trip.startAt);
  const endMs = toInstantMs(trip.endAt);
  const startCivil = civilDateOf(startMs, trip.timezone);
  let endCivil = civilDateOf(endMs, trip.timezone);
  if (civilKey(endCivil) < civilKey(startCivil)) {
    endCivil = startCivil; // degenerate or same-day range: one local day
  }
  return [startCivil, endCivil];
}

// Purpose: enumerate inclusive civil dates from start to end, rejecting
// trips beyond the hard cap so a corrupt row cannot run the loop forever.
export function enumerateDays(
  start: CivilDate,
  end: CivilDate,
): readonly CivilDate[] {
  const days: CivilDate[] = [];
  let cursor = start;
  while (civilKey(cursor) <= civilKey(end)) {
    days.push(cursor);
    if (days.length > MAX_TRIP_DAYS) {
      throw new RangeError(`trip exceeds ${MAX_TRIP_DAYS} days`);
    }
    cursor = shiftCivil(cursor, 1);
  }
  return days;
}
