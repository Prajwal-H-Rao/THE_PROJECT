/**
 * Calendar MCP server (task 21.11, module 21).
 * Exposes calendar tools through the MCP surface. Every call is validated
 * against a service JWT before any provider call is made. A call without
 * a provider token fails before policy evaluation.
 */

import {
  validateAndAuthorizeCall,
  loadCatalogue,
} from "@nova/contracts/mcp/server";

const CATALOGUE_DIR = new URL(
  "../../packages/contracts/mcp/catalogue",
  import.meta.url,
).pathname;

/**
 * Handle an incoming MCP call from the calendar service.
 * Rejects calls without a service JWT before any provider call.
 */
export async function handleMCPCall(
  rawCall: Record<string, unknown>,
  serviceJWT: string,
  audience: string,
  grantClient: unknown,
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  // Short-circuit: no service token provided → reject before policy.
  if (!serviceJWT || typeof serviceJWT !== "string" || serviceJWT.length === 0) {
    return { ok: false, error: "no service token provided", code: "unauthenticated" };
  }

  const catalogue = await loadCatalogue(CATALOGUE_DIR);
  return validateAndAuthorizeCall(rawCall, catalogue, serviceJWT, audience, grantClient as never);
}
