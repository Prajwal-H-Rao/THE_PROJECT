/**
 * Shared MCP validation helpers.
 * Provides UUID/ISO 8601 validation and optional-string handling used by
 * tool-validate.ts, audit-helpers.ts, and call-helpers.ts.
 */

// UUID regex accepting all RFC 4122 versions (v1-v5, v7)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate that a string is a UUID. Returns true when valid. */
export function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

/** Validate that a string is an ISO 8601 / RFC 3339 timestamp. Returns true when valid. */
export function isValidISO8601(str: string): boolean {
  const date = new Date(str);
  if (isNaN(date.getTime())) {
    return false;
  }
  const parsed = date.toISOString();
  try {
    return new Date(str).getTime() === date.getTime();
  } catch {
    return false;
  }
}

/** Return an optional string unchanged, or undefined when null/absent.
 * Throws when a non-null, non-undefined value is not a string. */
export function validateOptionalString(val: unknown, fieldName: string): string | undefined {
  if (val === undefined || val === null) {
    return undefined;
  }
  if (typeof val !== "string") {
    throw new Error(`${fieldName} must be a string if provided`);
  }
  return val;
}
