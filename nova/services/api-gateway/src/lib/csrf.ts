/** The origin allow-list and the csrf check for cookie writes. */

import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

import { CSRF_COOKIE, readCookie } from "@/lib/session";
import type { SessionClaims } from "@/lib/session-token";

/** The methods that change state. They need a csrf token. */
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** The failure of the csrf check. */
export interface CsrfFailure {
  readonly status: number;
  readonly code: string;
}

/** Return the failure of a cookie write, or null when the write may pass. */
export function checkCookieWrite(
  request: NextRequest,
  claims: SessionClaims,
  allowedOrigins: readonly string[],
): CsrfFailure | null {
  if (!UNSAFE_METHODS.has(request.method)) {
    return null;
  }
  const origin = request.headers.get("origin");
  if (origin === null || !allowedOrigins.includes(origin)) {
    // WHY: a browser sends the origin on every cross-site write.
    return { status: 403, code: "origin_not_allowed" };
  }
  const header = request.headers.get("x-csrf-token");
  if (header === null || !sameSecret(header, claims.csrf)) {
    return { status: 403, code: "csrf_token_missing_or_wrong" };
  }
  if (!sameSecret(readCookie(request, CSRF_COOKIE), claims.csrf)) {
    return { status: 403, code: "csrf_cookie_missing_or_wrong" };
  }
  return null;
}

/** Compare two secrets without a timing leak. */
export function sameSecret(left: string, right: string): boolean {
  // WHY: the digests hold 32 bytes, so the comparison never leaks a length.
  const first = createHash("sha256").update(left, "utf8").digest();
  const second = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(first, second);
}
