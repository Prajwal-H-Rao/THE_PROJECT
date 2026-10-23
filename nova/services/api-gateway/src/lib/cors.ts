/** The CORS middleware for the gateway. */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { settings } from "@/lib/settings";

/** The allowed origin and its configuration. */
interface CorsConfig {
  readonly origin: string;
  readonly allowedMethods: readonly string[];
  readonly allowedHeaders: readonly string[];
  readonly exposedHeaders: readonly string[];
  readonly credentials: boolean;
  readonly maxAge: number;
}

/** The cached CORS configurations. */
let corsCache: Map<string, CorsConfig> | null = null;

/** Build the CORS configuration from settings. */
function buildCorsCache(): Map<string, CorsConfig> {
  const map = new Map<string, CorsConfig>();
  const current = settings();
  for (const origin of current.allowedOrigins) {
    map.set(origin, {
      origin,
      allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"],
      exposedHeaders: ["X-Correlation-ID", "Retry-After"],
      credentials: true,
      maxAge: 86400,
    });
  }
  return map;
}

/** Get the CORS config for an origin, or null if not allowed. */
function getCorsConfig(origin: string | null): CorsConfig | null {
  if (origin === null) return null;
  if (corsCache === null) {
    corsCache = buildCorsCache();
  }
  return corsCache.get(origin) ?? null;
}

/** Handle the CORS preflight request. */
export function handleCorsPreflight(request: NextRequest): Response | null {
  if (request.method !== "OPTIONS") {
    return null;
  }
  const origin = request.headers.get("origin");
  const config = origin ? getCorsConfig(origin) : null;
  if (!config) {
    return new Response(null, { status: 403, statusText: "Origin not allowed" });
  }
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", config.origin);
  response.headers.set("Access-Control-Allow-Methods", config.allowedMethods.join(", "));
  response.headers.set("Access-Control-Allow-Headers", config.allowedHeaders.join(", "));
  response.headers.set("Access-Control-Expose-Headers", config.exposedHeaders.join(", "));
  if (config.credentials) {
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.set("Access-Control-Max-Age", String(config.maxAge));
  return response;
}

/** Apply CORS headers to a response. */
export function applyCorsHeaders(response: Response, origin: string | null): void {
  const config = origin ? getCorsConfig(origin) : null;
  if (!config) return;
  response.headers.set("Access-Control-Allow-Origin", config.origin);
  if (config.credentials) {
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.set("Access-Control-Expose-Headers", config.exposedHeaders.join(", "));
}