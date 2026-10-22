/** The proxy of the gateway. It runs before the route handlers. */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { clientAddress, UNKNOWN_ADDRESS } from "@/lib/client-address";
import { checkCookieWrite } from "@/lib/csrf";
import { logRequest } from "@/lib/logging";
import { RateLimiter } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/responses";
import { verifySession } from "@/lib/session";
import type { SessionContext } from "@/lib/session";
import { settings } from "@/lib/settings";
import { resolveTrace, traceparentOf } from "@/lib/trace";
import type { TraceContext } from "@/lib/trace";

/** The header that carries the verified user id to the route handler. */
export const USER_HEADER = "x-nova-user-id";

/** The header that carries the verified tenant scope to the route handler. */
export const TENANT_HEADER = "x-nova-tenant";

/** The header that carries the verified channel identity to the route handler. */
export const CHANNEL_HEADER = "x-nova-channel";

/** The header that carries the trace id to the route handler. */
export const TRACE_HEADER = "x-nova-trace-id";

let limiter: RateLimiter | null = null;

/** Return the limiter of the process. It lives until module 01 task 6 lands Redis. */
function rateLimiter(): RateLimiter {
  if (limiter === null) {
    const current = settings();
    limiter = new RateLimiter(current.rateLimitMax, current.rateLimitWindowMs);
  }
  return limiter;
}

/** Run the request chain. It answers every request exactly once. */
export function proxy(request: NextRequest): Response {
  const context = resolveTrace(request);
  try {
    const current = settings();
    const address = clientAddress(request, current.trustProxyHops);
    if (address !== UNKNOWN_ADDRESS) {
      const wait = rateLimiter().check("address:" + address, Date.now());
      if (wait > 0) {
        return reject(429, "rate_limited", context, request, { "retry-after": String(wait) });
      }
    }
    const session = verifySession(request, current.sessionSecret, Math.floor(Date.now() / 1000));
    if (!session.ok) {
      return reject(401, session.reason, context, request);
    }
    const userWait = rateLimiter().check("user:" + session.context.userId, Date.now());
    if (userWait > 0) {
      return reject(429, "rate_limited", context, request, { "retry-after": String(userWait) });
    }
    if (session.context.fromCookie) {
      const failure = checkCookieWrite(request, session.context.claims, current.allowedOrigins);
      if (failure !== null) {
        return reject(failure.status, failure.code, context, request);
      }
    }
    return pass(request, session.context, context);
  } catch {
    // WHY: the answer holds a fixed code. The message of the error never reaches the client.
    return reject(503, "service_unavailable", context, request);
  }
}

/** Answer a request that the chain refuses. */
function reject(
  status: number,
  code: string,
  context: TraceContext,
  request: NextRequest,
  headers: Readonly<Record<string, string>> = {},
): Response {
  const response = errorResponse(status, code, context.traceId, headers);
  logRequest(request.method, request.nextUrl.pathname, status, context.traceId);
  return withTrace(response, context);
}

/** Pass the request to the route handler with the verified context. */
function pass(request: NextRequest, session: SessionContext, context: TraceContext): Response {
  const headers = new Headers(request.headers);
  // WHY: a client must never set the context headers. The proxy owns them.
  headers.delete(USER_HEADER);
  headers.delete(TENANT_HEADER);
  headers.delete(CHANNEL_HEADER);
  headers.delete(TRACE_HEADER);
  headers.set(USER_HEADER, session.userId);
  headers.set(TENANT_HEADER, session.tenant);
  headers.set(CHANNEL_HEADER, session.channel);
  headers.set(TRACE_HEADER, context.traceId);
  return withTrace(NextResponse.next({ request: { headers } }), context);
}

/** Add the trace headers to an answer. */
function withTrace(response: Response, context: TraceContext): Response {
  response.headers.set("x-correlation-id", context.correlationId);
  response.headers.set("traceparent", traceparentOf(context));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
