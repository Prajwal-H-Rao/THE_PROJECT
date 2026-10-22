/** The service token gate of the internal routes. One call names one service identity. */

import { verifyToken } from "@nova/contracts";
import type { ServiceClaims } from "@nova/contracts";

import type { NextRequest } from "next/server";

import type { Settings } from "@/lib/settings";

/** The result of a service call check. A rejection carries a reason code. */
export type ServiceCheck =
  | { readonly ok: true; readonly claims: ServiceClaims }
  | { readonly ok: false; readonly reason: string };

/** The header that carries the bearer service token. */
const BEARER_PREFIX = "Bearer ";

/** The header that a private caller may use instead of the Authorization header. */
export const SERVICE_TOKEN_HEADER = "x-nova-service-token";

/** The header that carries the verified service id to the route handler. */
export const SERVICE_ID_HEADER = "x-nova-service-id";

/** The header that carries the verified service scope to the route handler. */
export const SERVICE_SCOPE_HEADER = "x-nova-service-scope";

/** Verify one internal call. It never throws and its reasons name no secret. */
export function verifyServiceCall(
  request: NextRequest,
  config: Settings,
  nowSeconds: number,
): ServiceCheck {
  // WHY: the gate fails closed. Without a configured key no token can ever count as valid.
  if (config.serviceJwtSecret === "") {
    return { ok: false, reason: "service_disabled" };
  }
  const token = tokenOf(request);
  if (token === null) {
    return { ok: false, reason: "missing_service_token" };
  }
  const check = verifyToken(
    token,
    config.serviceJwtSecret,
    { issuer: config.serviceTokenIssuer, audience: config.serviceTokenAudience },
    nowSeconds,
  );
  if (!check.ok) {
    return { ok: false, reason: check.reason };
  }
  return { ok: true, claims: check.claims };
}

/** Return the token of one request, or null when the request carries none. */
function tokenOf(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header !== null && header.startsWith(BEARER_PREFIX)) {
    const candidate = header.slice(BEARER_PREFIX.length).trim();
    if (candidate !== "") {
      return candidate;
    }
  }
  const named = request.headers.get(SERVICE_TOKEN_HEADER);
  if (named !== null && named.trim() !== "") {
    return named.trim();
  }
  return null;
}
