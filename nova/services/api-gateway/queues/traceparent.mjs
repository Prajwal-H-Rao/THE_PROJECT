/**
 * The traceparent rules of the queue runner. The module holds no workspace
 * import: the runner image copies only queues/, so a gateway import would
 * dangle here. The rules mirror the gateway trace module at src/lib/trace.ts.
 */

import { randomBytes } from "node:crypto";

/** The pattern of one whole traceparent header value. */
const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

/** Return the trace id of one traceparent header. A rejection answers null. */
export function traceIdOf(header) {
  if (typeof header !== "string") {
    return null;
  }
  const match = TRACEPARENT.exec(header.trim());
  return match === null ? null : match[1];
}

/** Return the trace context of one environment value. An invalid value synthesizes one. */
export function traceContext(envValue) {
  const traceId = traceIdOf(envValue);
  if (traceId !== null) {
    return { traceId, header: envValue.trim() };
  }
  // WHY: the runner must hold one valid context even when the caller sends none.
  // The synthesized id follows the same 32-hex rule the gateway validates at the edge.
  const trace = randomBytes(16).toString("hex");
  const span = randomBytes(8).toString("hex");
  return { traceId: trace, header: "00-" + trace + "-" + span + "-01" };
}
