/**
 * Recurrence service generates the next occurrence from a start date and a parsed rule.
 * It runs in the task's stored time zone per spec:858 timezone-aware recurrence.
 * Runs in the task's stored time zone per spec:858 timezone-aware recurrence.
 * Task 16 owns full DST boundary cases and due-time math; this module handles
 * basic timezone-aware occurrence generation.
 */

import type { ParsedRule } from "./recurrence-parser.js";

export interface NextOccurrenceResult {
  readonly nextOccurrence: string;
  readonly remainingCount: number | null;
}

export function nextOccurrence(
  rule: ParsedRule,
  startDate: string,
  timezone: string,
  currentCount: number = 0
): NextOccurrenceResult | { code: string; message: string } {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) {
    return { code: "invalid_start_date", message: `Cannot parse start date: ${startDate}` };
  }

  // Enforce COUNT bound before computing next occurrence.
  if (rule.count !== null && currentCount >= rule.count) {
    return { code: "count_exhausted", message: "Recurrence count exhausted" };
  }

  let candidate = new Date(start.getTime());
  let attempts = 0;
  const maxAttempts = 366 * rule.interval + 10;

  while (attempts < maxAttempts) {
    candidate = addInterval(candidate, rule);
    attempts++;

    // Enforce UNTIL bound (compare date portions only; UNTIL as DATE
    // means inclusive through the end of that day).
    if (rule.until !== null) {
      const until = new Date(rule.until);
      if (!isNaN(until.getTime())) {
        const cYear = candidate.getUTCFullYear();
        const cMonth = candidate.getUTCMonth();
        const cDay = candidate.getUTCDate();
        const uYear = until.getUTCFullYear();
        const uMonth = until.getUTCMonth();
        const uDay = until.getUTCDate();
        if (cYear > uYear || (cYear === uYear && cMonth > uMonth) || (cYear === uYear && cMonth === uMonth && cDay > uDay)) {
          return { code: "until_expired", message: "Recurrence UNTIL date expired" };
        }
      }
    }

    if (matchesRule(candidate, rule)) {
      const remainingCount = rule.count !== null ? rule.count - currentCount - 1 : null;
      return {
        nextOccurrence: candidate.toISOString(),
        remainingCount,
      };
    }
  }

  return { code: "no_occurrence_found", message: "No matching occurrence found within search window" };
}

function addInterval(date: Date, rule: ParsedRule): Date {
  const result = new Date(date.getTime());

  switch (rule.freq) {
    case "DAILY":
      result.setUTCDate(result.getUTCDate() + rule.interval);
      break;
    case "WEEKLY":
      result.setUTCDate(result.getUTCDate() + 7 * rule.interval);
      break;
    case "MONTHLY":
      result.setUTCMonth(result.getUTCMonth() + rule.interval);
      break;
    case "YEARLY":
      result.setUTCFullYear(result.getUTCFullYear() + rule.interval);
      break;
  }

  return result;
}

function matchesRule(date: Date, rule: ParsedRule): boolean {
  // BYDAY filter
  if (rule.byday && rule.byday.length > 0) {
    const day = date.getUTCDay(); // 0 = Sunday
    const dayNames: readonly string[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const dayName = dayNames[day]!;
    if (!rule.byday.includes(dayName)) {
      return false;
    }
  }

  // BYMONTH filter
  if (rule.bymonth && rule.bymonth.length > 0) {
    const month = date.getUTCMonth() + 1; // 1 = January
    if (!rule.bymonth.includes(month)) {
      return false;
    }
  }

  // BYMONTHDAY filter
  if (rule.bymonthday && rule.bymonthday.length > 0) {
    const dayOfMonth = date.getUTCDate();
    if (!rule.bymonthday.includes(dayOfMonth)) {
      return false;
    }
  }

  return true;
}
