/** The request log of the gateway. It holds no secret. */

/** The longest path that the log holds. */
const MAX_PATH_LENGTH = 200;

/** Log one request. The line holds no cookie, no token and no body. */
export function logRequest(
  method: string,
  pathname: string,
  status: number,
  traceId: string,
): void {
  console.log(JSON.stringify({
    event: "request",
    method,
    path: pathname.slice(0, MAX_PATH_LENGTH),
    status,
    trace_id: traceId,
  }));
}
