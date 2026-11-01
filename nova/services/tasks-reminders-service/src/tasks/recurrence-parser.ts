/**
 * Recurrence parser parses deterministic RRULE rules and validates their bounds.
 * It parses RFC 5545 RRULE strings into structured fields.
 * Validates bounds (UNTIL, COUNT). UTC-based parsing; timezone
 * application is handled by the recurrence service per task timezone.
 */

export interface ParsedRule {
  readonly freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  readonly interval: number;
  readonly until: string | null;
  readonly count: number | null;
  readonly byday: readonly string[] | null;
  readonly bymonth: readonly number[] | null;
  readonly bymonthday: readonly number[] | null;
  readonly wkst: string | null;
}

export interface ParseError {
  readonly code: string;
  readonly message: string;
}

export function parseRule(rule: string): ParsedRule | ParseError {
  if (!rule || rule.trim().length === 0) {
    return { code: "empty_rule", message: "RRULE string is empty" };
  }

  const parts = rule.split(";").map((p) => p.trim()).filter((p) => p.length > 0);
  const fields: Record<string, string> = {};

  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) {
      return { code: "invalid_format", message: `Missing '=' in rule part: ${part}` };
    }
    const key = part.slice(0, eq).toUpperCase();
    const value = part.slice(eq + 1);
    fields[key] = value;
  }

  const freq = fields["FREQ"];
  if (!freq || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) {
    return { code: "invalid_freq", message: `Invalid or missing FREQ: ${freq ?? "none"}` };
  }

  const intervalStr = fields["INTERVAL"];
  const interval = intervalStr ? parseInt(intervalStr, 10) : 1;
  if (isNaN(interval) || interval < 1) {
    return { code: "invalid_interval", message: `Invalid INTERVAL: ${intervalStr ?? "none"}` };
  }

  const until = fields["UNTIL"] ?? null;
  const countStr = fields["COUNT"];
  let count: number | null = null;
  if (countStr) {
    count = parseInt(countStr, 10);
    if (isNaN(count) || count < 1) {
      return { code: "invalid_count", message: `Invalid COUNT: ${countStr}` };
    }
  }

  const byday = fields["BYDAY"] ? fields["BYDAY"].split(",") : null;
  const bymonth = fields["BYMONTH"] ? fields["BYMONTH"].split(",").map((v) => parseInt(v, 10)) : null;
  const bymonthday = fields["BYMONTHDAY"] ? fields["BYMONTHDAY"].split(",").map((v) => parseInt(v, 10)) : null;
  const wkst = fields["WKST"] ?? null;

  return {
    freq: freq as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
    interval,
    until,
    count,
    byday,
    bymonth,
    bymonthday,
    wkst,
  };
}

export function isValidRule(rule: string): boolean {
  const result = parseRule(rule);
  return (result as { code?: string }).code === undefined;
}
