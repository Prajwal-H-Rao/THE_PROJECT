/** The session check. It verifies the session and builds the request context. */

import type { NextRequest } from "next/server";

import { verifyToken } from "@/lib/session-token";
import type { SessionClaims } from "@/lib/session-token";

/** The name of the session cookie. The identity flow sets it. */
export const SESSION_COOKIE = "nova_session";

/** The name of the readable csrf cookie. The identity flow sets it. */
export const CSRF_COOKIE = "nova_csrf";

/** The context of one verified session. */
export interface SessionContext {
  readonly claims: SessionClaims;
  readonly userId: string;
  readonly tenant: string;
  readonly channel: string;
  readonly fromCookie: boolean;
}

/** The result of the session check. */
export type SessionResult =
  | { readonly ok: true; readonly context: SessionContext }
  | { readonly ok: false; readonly reason: string };

/** Return the value of a cookie, or an empty string. */
export function readCookie(request: NextRequest, name: string): string {
  return request.cookies.get(name)?.value ?? "";
}

/** Return the user session token of a request, or an empty string. */
export function readSessionHeader(request: NextRequest): string {
  const header = request.headers.get("authorization");
  if (header === null) {
    return "";
  }
  // WHY: the Session scheme keeps the user token apart from the service token of module 01 task 8.
  const match = /^Session\s+(\S+)$/i.exec(header);
  return match?.[1] ?? "";
}

/** Verify the session of a request. It never throws. */
export function verifySession(
  request: NextRequest,
  secret: string,
  nowSeconds: number,
): SessionResult {
  const cookieToken = readCookie(request, SESSION_COOKIE);
  const headerToken = readSessionHeader(request);
  if (cookieToken !== "" && headerToken !== "" && cookieToken !== headerToken) {
    // WHY: two different tokens mean a stolen cookie or a forged header.
    return { ok: false, reason: "conflicting_session_tokens" };
  }
  const token = cookieToken !== "" ? cookieToken : headerToken;
  if (token === "") {
    return { ok: false, reason: "no_session" };
  }
  const verification = verifyToken(token, secret, nowSeconds);
  if (!verification.ok) {
    return { ok: false, reason: verification.reason };
  }
  return {
    ok: true,
    context: {
      claims: verification.claims,
      userId: verification.claims.sub,
      tenant: verification.claims.tenant,
      channel: verification.claims.channel,
      fromCookie: cookieToken !== "",
    },
  };
}
