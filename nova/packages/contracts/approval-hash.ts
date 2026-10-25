/** The canonical payload hash for approval grants. One helper, used by the
 * policy service and by every domain service that verifies a grant, so both
 * ends canonicalize identically.
 *
 * Binding semantics (see docs/design-notes/nova-approval-grants.md):
 * the hash is SHA-256 over the canonical JSON bytes of the payload. One
 * changed canonical byte means one changed content byte and invalidates the
 * grant. Whitespace and key order never reach the canonical bytes. */

import { createHash } from "node:crypto";

/** Values that JSON cannot represent. Rejected instead of silently collapsed. */
function checkRepresentable(value: unknown, seen: Set<object>): void {
  // WHY: undefined is representable by omission (objects) and as null (arrays);
  // canonicalJson decides which, per JSON.stringify semantics.
  if (value === undefined || value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    // WHY: ECMAScript JSON.stringify folds NaN and Infinity to null, which
    // would merge distinct payloads into one hash. Reject them instead.
    if (!Number.isFinite(value)) {
      throw new TypeError("payload holds a non-JSON number (NaN or Infinity)");
    }
    return;
  }
  if (typeof value === "string") return;
  if (typeof value === "bigint") {
    throw new TypeError("payload holds a BigInt, which JSON cannot represent");
  }
  if (typeof value !== "object") {
    throw new TypeError("payload holds a value JSON cannot represent");
  }
  if (seen.has(value as object)) {
    throw new TypeError("payload holds a cyclic structure");
  }
  seen.add(value as object);
  if (Array.isArray(value)) {
    for (const item of value) checkRepresentable(item, seen);
  } else {
    for (const item of Object.values(value as Record<string, unknown>)) {
      checkRepresentable(item, seen);
    }
  }
  seen.delete(value as object);
}

/** Canonical JSON: keys sorted by UTF-16 code unit, no whitespace.
 * Object properties holding undefined are omitted; array items holding
 * undefined serialize as null. Object.is(-0, 0) is treated as equal. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "string") return JSON.stringify(value);
    // WHY: JSON.stringify(-0) prints "0", so the two are one canonical value.
    return JSON.stringify(value === undefined || Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonicalJson(item ?? null)).join(",") + "]";
  }
  // WHY: a Date or Map would silently collapse to "" or {}. Reject anything
  // that is not a plain object, so distinct payloads cannot share one hash.
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new TypeError("payload holds a non-plain object");
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return "{" + entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",") + "}";
}

/** Encode one payload into its canonical form. */
export function canonicalPayload(value: unknown): string {
  checkRepresentable(value, new Set());
  return canonicalJson(value);
}

/** Hash one payload: SHA-256 hex over its canonical JSON bytes. */
export function computeApprovalHash(value: unknown): string {
  return createHash("sha256").update(canonicalPayload(value), "utf8").digest("hex");
}
