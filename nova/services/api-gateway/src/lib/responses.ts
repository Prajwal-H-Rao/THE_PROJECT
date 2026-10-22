/** The JSON answers of the gateway. */

/** The body of an error answer. */
export interface ErrorBody {
  readonly error: string;
  readonly trace_id: string;
}

/** Send a JSON answer. */
export function jsonResponse(
  status: number,
  body: unknown,
  headers: Readonly<Record<string, string>> = {},
): Response {
  return Response.json(body, { status, headers });
}

/** Send an error answer. It carries the error code and the trace id. */
export function errorResponse(
  status: number,
  code: string,
  traceId: string,
  headers: Readonly<Record<string, string>> = {},
): Response {
  const body: ErrorBody = { error: code, trace_id: traceId };
  return jsonResponse(status, body, headers);
}
