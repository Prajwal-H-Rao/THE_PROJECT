/**
 * Finance MCP server (task 21.12, module 21).
 * Exposes only finance-service tools through the MCP surface.
 * Every call is validated against a service JWT before any provider call.
 * A call without a provider token fails before policy evaluation.
 */

import {
  validateAndAuthorizeCall,
  loadCatalogue,
  type ToolCatalogue,
} from "@nova/contracts/mcp/server";
import type { ToolDefinition, CanonicalFamily } from "@nova/contracts/mcp/tool";

const CATALOGUE_DIR = new URL(
  "../../packages/contracts/mcp/catalogue",
  import.meta.url,
).pathname;

const SERVICE_NAME = "finance-service";

function scopeCatalogue(full: ToolCatalogue): ToolCatalogue {
  const tools = new Map<string, ToolDefinition>();
  const byFamily = new Map<CanonicalFamily, ToolDefinition[]>();
  for (const [name, tool] of full.tools) {
    if (tool.owning_service === SERVICE_NAME) {
      tools.set(name, tool);
      const familyTools = byFamily.get(tool.family) || [];
      familyTools.push(tool);
      byFamily.set(tool.family, familyTools);
    }
  }
  return { tools, byFamily };
}

export async function handleMCPCall(
  rawCall: Record<string, unknown>,
  serviceJWT: string,
  audience: string,
  grantClient: unknown,
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  if (
    !serviceJWT ||
    typeof serviceJWT !== "string" ||
    serviceJWT.length === 0
  ) {
    return {
      ok: false,
      error: "no service token provided",
      code: "unauthenticated",
    };
  }

  const fullCatalogue = await loadCatalogue(CATALOGUE_DIR);
  const catalogue = scopeCatalogue(fullCatalogue);
  return validateAndAuthorizeCall(
    rawCall,
    catalogue,
    serviceJWT,
    audience,
    grantClient as never,
  );
}
