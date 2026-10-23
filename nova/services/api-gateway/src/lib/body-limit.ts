/** The body size limit middleware for the gateway. */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { settings } from "@/lib/settings";

/** The body limit configuration. */
interface BodyLimitConfig {
  readonly maxBodyBytes: number;
  readonly maxFileBytes: number;
  readonly allowedMimeTypes: readonly string[];
}

/** The cached body limit configuration. */
let bodyLimitConfig: BodyLimitConfig | null = null;

/** Get the body limit config, building it on first call. */
function getBodyLimitConfig(): BodyLimitConfig {
  if (bodyLimitConfig === null) {
    const current = settings();
    bodyLimitConfig = {
      maxBodyBytes: current.maxBodyBytes,
      maxFileBytes: current.maxBodyBytes * 10, // 10x for files
      allowedMimeTypes: ["application/json", "application/x-www-form-urlencoded", "multipart/form-data"],
    };
  }
  return bodyLimitConfig;
}

/** Check the body size limit. Returns an error response if over limit, null if OK. */
export async function checkBodyLimit(request: NextRequest): Promise<Response | null> {
  const config = getBodyLimitConfig();
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const length = parseInt(contentLength, 10);
    if (length > getBodyLimitConfig().maxBodyBytes) {
      return new Response(
        JSON.stringify({ error: "body_too_large", message: "Request body exceeds maximum size" }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  return null;
}

/** Apply body size limits to a response (for documentation). */
export function applyBodyLimitHeaders(response: Response): void {
  const config = getBodyLimitConfig();
  response.headers.set("X-Max-Body-Bytes", String(config.maxBodyBytes));
}