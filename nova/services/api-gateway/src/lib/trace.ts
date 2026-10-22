/** The trace context of one request. */

import { randomBytes, randomUUID } from "node:crypto";

/** The pattern that a correlation id must match. */
const CORRELATION_ID = /^[A-Za-z0-9._:-]{1,128}$/;

/** The pattern that a trace id must match. */
const TRACE_ID = /^[0-9a-f]{32}$/;

/** The trace context of one request. */
export interface TraceContext {
  readonly correlationId: string;
  readonly traceId: string;
  readonly spanId: string;
}

/** Return the trace context of a request. It never echoes untrusted text. */
export function resolveTrace(request: Request): TraceContext {
  const correlation = request.headers.get("x-correlation-id");
  const parent = request.headers.get("traceparent");
  const traceId = traceIdOf(correlation, parent);
  return {
    correlationId: correlation !== null && CORRELATION_ID.test(correlation) ? correlation : traceId,
    traceId,
    spanId: randomBytes(8).toString("hex"),
  };
}

/** Return the traceparent header that carries the trace context. */
export function traceparentOf(context: TraceContext): string {
  return "00-" + context.traceId + "-" + context.spanId + "-01";
}

/** Return the trace id of the request. It never echoes untrusted text. */
function traceIdOf(correlation: string | null, parent: string | null): string {
  if (parent !== null) {
    // WHY: the traceparent header holds the trace id in its second field.
    const field = parent.split("-")[1];
    if (field !== undefined && TRACE_ID.test(field)) {
      return field;
    }
  }
  if (correlation !== null && TRACE_ID.test(correlation)) {
    return correlation;
  }
  return randomUUID().replace(/-/g, "");
}
