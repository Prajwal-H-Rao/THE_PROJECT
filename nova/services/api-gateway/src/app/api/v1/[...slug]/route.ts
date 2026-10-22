/** The API route of the gateway. It holds no domain path yet. */

import type { NextRequest } from "next/server";

import { BodyTooLargeError, readBody } from "@/lib/body";
import { logRequest } from "@/lib/logging";
import { settings } from "@/lib/settings";
import { resolveTrace } from "@/lib/trace";

/** The header that carries the verified user id. The proxy sets it. */
const USER_HEADER = "x-nova-user-id";

/** The header that carries the trace id. The proxy sets it. */
const TRACE_HEADER = "x-nova-trace-id";

/** The body of the answer of an unknown API path. */
interface NotFoundBody {
  readonly error: string;
  readonly trace_id: string;
  readonly user_id: string;
}

/** Answer the API path. The gateway routes no domain path yet. */
async function answer(request: NextRequest): Promise<Response> {
  const traceId = request.headers.get(TRACE_HEADER) ?? resolveTrace(request).traceId;
  const userId = request.headers.get(USER_HEADER) ?? "";
  try {
    const current = settings();
    await readBody(request, current.maxBodyBytes);
    logRequest(request.method, request.nextUrl.pathname, 404, traceId);
    // WHY: the user id proves that the proxy passed the verified context downstream.
    const body: NotFoundBody = { error: "not_found", trace_id: traceId, user_id: userId };
    return Response.json(body, { status: 404 });
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      logRequest(request.method, request.nextUrl.pathname, 413, traceId);
      return Response.json({ error: "body_too_large", trace_id: traceId }, { status: 413 });
    }
    logRequest(request.method, request.nextUrl.pathname, 500, traceId);
    return Response.json({ error: "internal_error", trace_id: traceId }, { status: 500 });
  }
}

export function GET(request: NextRequest): Promise<Response> {
  return answer(request);
}

export function POST(request: NextRequest): Promise<Response> {
  return answer(request);
}

export function PUT(request: NextRequest): Promise<Response> {
  return answer(request);
}

export function PATCH(request: NextRequest): Promise<Response> {
  return answer(request);
}

export function DELETE(request: NextRequest): Promise<Response> {
  return answer(request);
}
