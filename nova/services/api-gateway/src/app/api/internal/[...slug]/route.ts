/** The internal route of the gateway. It serves verified service calls only. */

import type { NextRequest } from "next/server";

import { logRequest } from "@/lib/logging";
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
