/**
 * Timezone helpers convert between UTC ms and local wall-clock components.
 * Uses Intl.DateTimeFormat for IANA time zone support (Node 22 ships full ICU).
 * DST semantics: a gap time maps forward to the first valid instant after the
 * gap; an ambiguous time maps to the earliest UTC instant that produces it.
 */

export interface LocalComponents {
  readonly year: number;
  readonly month: number;   // 1-12
  readonly day: number;     // 1-31
  readonly hour: number;    // 0-23
  readonly minute: number;  // 0-59
  readonly second: number;  // 0-59
}

/** Convert UTC ms to local wall-clock components in the given IANA timezone. */
export function toLocalComponents(utcMs: number, timezone: string): LocalComponents {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));

  const get = (name: string): number =>
    Number(parts.find((p) => p.type === name)!.value)!;

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Validate an IANA timezone name. Catches RangeError from Intl. */
export function validateTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert local wall-clock components to UTC ms in the target timezone.
 * Scans a 30-hour window around midnight UTC of the target local date.
 * Exact match when the local time exists (earliest UTC instant for ambiguity).
 * DST gap (no instant maps to the local time) maps forward to the first
 * valid instant after the gap.
 */
export function toUTC(components: LocalComponents, timezone: string): number {
  const targetMs = Date.UTC(components.year, components.month - 1, components.day);
  const scanStart = targetMs - 15 * 60 * 60 * 1000; // 15h before midnight UTC
  const scanEnd = targetMs + 15 * 60 * 60 * 1000; // 15h after midnight UTC
  const stepMs = 60 * 1000; // 1 minute

  const targetTime = components.hour * 3600 + components.minute * 60 + components.second;
  let bestAfterGap: number | null = null;

  for (let probe = scanStart; probe <= scanEnd; probe += stepMs) {
    const local = toLocalComponents(probe, timezone);

    // Same local date required for both exact match and gap resolution.
    if (
      local.year !== components.year ||
      local.month !== components.month ||
      local.day !== components.day
    ) {
      continue;
    }

    // Exact match: same wall-clock time. Earliest UTC instant wins (ambiguity).
    const localTime = local.hour * 3600 + local.minute * 60 + local.second;
    if (localTime === targetTime) {
      return probe;
    }

    // Gap tracking: first instant on the target date with local time after target.
    if (localTime > targetTime && bestAfterGap === null) {
      bestAfterGap = probe;
    }
  }

  // Gap time: no exact instant maps to it. Return first valid instant after gap.
  if (bestAfterGap !== null) return bestAfterGap;

  // Fallback: treat components as UTC.
  return targetMs;
}
