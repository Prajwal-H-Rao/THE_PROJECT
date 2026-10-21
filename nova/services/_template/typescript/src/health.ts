/** The health endpoints. They leak no secret. */
import type { IncomingMessage, ServerResponse } from "node:http";

/** The body of a health answer. */
export interface HealthBody {
  readonly status: string;
}

/** Answer that the process runs. */
export function liveBody(): HealthBody {
  return { status: "live" };
}

/** Answer that the service accepts traffic. */
export function readyBody(): HealthBody {
  return { status: "ready" };
}

/** Send a health answer. The response carries no other field. */
export function sendHealth(response: ServerResponse, body: HealthBody): void {
  const payload = JSON.stringify(body);
  response.writeHead(200, { "content-type": "application/json" });
  response.end(payload);
}

/** Answer a health request. Return True when the request was a health request. */
export function handleHealth(request: IncomingMessage, response: ServerResponse): boolean {
  const path = request.url ?? "/";
  if (path === "/health/live") {
    sendHealth(response, liveBody());
    return true;
  }
  if (path === "/health/ready") {
    sendHealth(response, readyBody());
    return true;
  }
  return false;
}
