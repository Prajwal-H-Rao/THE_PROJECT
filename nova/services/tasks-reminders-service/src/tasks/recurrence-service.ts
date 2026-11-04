/**
 * Recurrence service generates the next occurrence from a start date and a parsed rule.
 * Runs in the task's stored time zone per spec:858 timezone-aware recurrence.
 * All interval arithmetic, BYDAY/BYMONTH/BYMONTHDAY matching, and UNTIL comparison
 * operate on LocalComponents so DST transitions are handled in the task's zone.
 * DST gap maps forward; DST ambiguity maps to the earliest UTC instant.
 */

import type { ParsedRule } from "./recurrence-parser.js";
import {
  toLocalComponents,
  toUTC,
  validateTimezone,
  type LocalComponents,
} from "./timezone.js";

export interface NextOccurrenceResult {
  readonly nextOccurrence: string;
  readonly remainingCount: number | null;
}

export type RecurrenceError = { code: string; message: string };

export function nextOccurrence(
  rule: ParsedRule,
  startDate: string,
  timezone: string,
  currentCount: number = 0
): NextOccurrenceResult | RecurrenceError {
  if (!validateTimezone(timezone)) {
    return { code: "invalid_timezone", message: `Invalid timezone: ${timezone}` };
  }

  const startMs = new Date(startDate).getTime();
  if (isNaN(startMs)) {
    return { code: "invalid_start_date", message: `Cannot parse start date: ${startDate}` };
  }

  if (rule.count !== null && currentCount >= rule.count) {
    return { code: "count_exhausted", message: "Recurrence count exhausted" };
  }

  let current = toLocalComponents(startMs, timezone);
  let attempts = 0;
  const maxAttempts = 366 * rule.interval + 10;

  while (attempts < maxAttempts) {
    current = addInterval(current, rule);
    attempts++;

    if (rule.until !== null) {
      const until = new Date(rule.until).getTime();
      if (!isNaN(until)) {
        const untilLocal = toLocalComponents(until, timezone);
        // UNTIL is a DATE, inclusive through end of that day: compare year/month/day only.
        if (
          current.year > untilLocal.year ||
          (current.year === untilLocal.year && current.month > untilLocal.month) ||
          (current.year === untilLocal.year && current.month === untilLocal.month && current.day > untilLocal.day)
        ) {
          return { code: "until_expired", message: "Recurrence UNTIL date expired" };
        }
      }
    }

    if (matchesRule(current, rule)) {
      const remainingCount = rule.count !== null ? rule.count - currentCount - 1 : null;
      return {
        nextOccurrence: new Date(toUTC(current, timezone)).toISOString(),
        remainingCount,
      };
    }
  }

  return { code: "no_occurrence_found", message: "No matching occurrence found within search window" };
}

/** Add the rule's interval to local wall-clock components. */
function addInterval(components: LocalComponents, rule: ParsedRule): LocalComponents {
  let result = { ...components };

  switch (rule.freq) {
    case "DAILY":
      result = addDays(result, rule.interval);
      break;
    case "WEEKLY":
      result = addDays(result, 7 * rule.interval);
      break;
    case "MONTHLY":
      result = addMonths(result, rule.interval);
      break;
    case "YEARLY":
      result = addYears(result, rule.interval);
      break;
  }

  return result;
}

/** Add N calendar days at the local level. DST gaps/ambiguities resolve in toUTC. */
function addDays(components: LocalComponents, days: number): LocalComponents {
  let remaining = days;
  let result = { ...components };

  // Step day-by-day so each local date is validated against the timezone.
  while (remaining > 0) {
    result = nextLocalDay(result);
    remaining--;
  }
  while (remaining < 0) {
    result = prevLocalDay(result);
    remaining++;
  }

  return result;
}

/** Move to the same wall-clock time on the next calendar day. */
function nextLocalDay(c: LocalComponents): LocalComponents {
  const trial = { ...c, day: c.day + 1 };
  const lastDay = daysInMonth(c.year, c.month);
  if (trial.day > lastDay) {
    return { year: c.year, month: c.month + 1, day: 1, hour: c.hour, minute: c.minute, second: c.second };
  }
  return trial;
}

/** Move to the same wall-clock time on the previous calendar day. */
function prevLocalDay(c: LocalComponents): LocalComponents {
  const trial = { ...c, day: c.day - 1 };
  if (trial.day < 1) {
    const prevMonth = c.month - 1;
    return {
      year: prevMonth < 1 ? c.year - 1 : c.year,
      month: prevMonth < 1 ? 12 : prevMonth,
      day: daysInMonth(prevMonth < 1 ? c.year - 1 : c.year, prevMonth < 1 ? 12 : prevMonth),
      hour: c.hour,
      minute: c.minute,
      second: c.second,
    };
  }
  return trial;
}

/** Add N calendar months, clamping the day to the month's last day. */
function addMonths(components: LocalComponents, months: number): LocalComponents {
  let totalMonths = (components.year * 12 + (components.month - 1)) + months;
  let year = Math.floor(totalMonths / 12);
  let month = (totalMonths % 12) + 1;
  const day = Math.min(components.day, daysInMonth(year, month));
  return { year, month, day, hour: components.hour, minute: components.minute, second: components.second };
}

/** Add N calendar years, clamping Feb 29 to Feb 28 in non-leap years. */
function addYears(components: LocalComponents, years: number): LocalComponents {
  const year = components.year + years;
  const day = components.month === 2 && components.day === 29 && !isLeapYear(year) ? 28 : components.day;
  return { year, month: components.month, day, hour: components.hour, minute: components.minute, second: components.second };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

/** Match local components against the rule's BYDAY/BYMONTH/BYMONTHDAY filters. */
function matchesRule(components: LocalComponents, rule: ParsedRule): boolean {
  if (rule.byday && rule.byday.length > 0) {
    const dayName = weekdayName(components.year, components.month, components.day);
    if (!rule.byday.includes(dayName)) return false;
  }

  if (rule.bymonth && rule.bymonth.length > 0) {
    if (!rule.bymonth.includes(components.month)) return false;
  }

  if (rule.bymonthday && rule.bymonthday.length > 0) {
    if (!rule.bymonthday.includes(components.day)) return false;
  }

  return true;
}

/** Weekday name (SU=0 ... SA=6) for the local date, computed via UTC weekday of noon local. */
function weekdayName(year: number, month: number, day: number): string {
  const names: readonly string[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return names[d.getUTCDay()]!;
}
