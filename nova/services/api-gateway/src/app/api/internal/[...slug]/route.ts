/** The internal route of the gateway. It serves verified service calls only. */

import type { NextRequest } from "next/server";

import { logRequest } from "@/lib/logging";
import { BodyTooLargeError, readBody } from "@/lib/body";
import { validateContract } from "@/lib/contract-validation";
import { settings } from "@/lib/settings";
import { SERVICE_ID_HEADER, SERVICE_SCOPE_HEADER } from "@/lib/service-auth";

/** The header that carries the trace id. The proxy sets it. */
const TRACE_HEADER = "x-nova-trace-id";

/** The body of a verified internal answer. */
interface InternalBody {
  readonly ok: boolean;
  readonly service: string;
  readonly scope: string;
  readonly trace_id: string;
}

/** Answer the internal path. The proxy has verified the service token already. */
export async function GET(request: NextRequest): Promise<Response> {
  return answer(request);
}

/** Accept writes from service callers too. The chain has verified the call. */
export async function POST(request: NextRequest): Promise<Response> {
  const traceId = request.headers.get(TRACE_HEADER) ?? "";
  // WHY: fail-closed first. Headers.get returns null for an absent header, so
  // both null and "" mean the proxy never passed a verified service context
  // and the call answers closed before the handler reads anything else.
  const serviceId = request.headers.get(SERVICE_ID_HEADER);
  if (serviceId === null || serviceId === "") {
    return answer(request);
  }
  let bodyText: string;
  try {
    bodyText = await readBody(request, settings().maxBodyBytes);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      // WHY: an oversize body must answer 413, not a raw 500.
      logRequest(request.method, request.nextUrl.pathname, 413, traceId);
      return Response.json({ error: "body_too_large", trace_id: traceId }, { status: 413 });
    }
    throw error;
  }
  const contractError = validateContract(request.nextUrl.pathname, request.method, bodyText, traceId);
  if (contractError !== null) {
    logRequest(request.method, request.nextUrl.pathname, 400, traceId);
    return contractError;
  }
  return answer(request);
}

/** Build the verified answer from the context headers that the proxy set. */
function answer(request: NextRequest): Response {
  // WHY: the handler trusts the proxy, not the caller. A missing header means the
  // proxy never passed the call, so the route answers closed.
  const service = request.headers.get(SERVICE_ID_HEADER) ?? "";
  const scope = request.headers.get(SERVICE_SCOPE_HEADER) ?? "";
  const traceId = request.headers.get(TRACE_HEADER) ?? "";
  if (service === "") {
    logRequest(request.method, request.nextUrl.pathname, 401, traceId);
    return Response.json({ error: "missing_service_context" }, { status: 401 });
  }
  const body: InternalBody = { ok: true, service, scope, trace_id: traceId };
  logRequest(request.method, request.nextUrl.pathname, 200, traceId);
  return Response.json(body);
}
