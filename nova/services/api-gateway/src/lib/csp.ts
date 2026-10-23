/** The Content Security Policy middleware for the gateway. */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { settings } from "@/lib/settings";

/** The cached CSP policy string. */
let cspPolicy: string | null = null;

/** Build the CSP policy string from settings. */
function buildCspPolicy(): string {
  const current = settings();
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "https:"],
    "font-src": ["'self'", "https:"],
    "connect-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

/** Get the CSP policy string, building it on first call. */
function getCspPolicy(): string {
  if (cspPolicy === null) {
    cspPolicy = buildCspPolicy();
  }
  return cspPolicy;
}

/** Apply CSP headers to a response. */
export function applyCspHeaders(response: Response): void {
  const policy = getCspPolicy();
  if (policy) {
    response.headers.set("Content-Security-Policy", policy);
  }
}

/** Apply CSP report-only headers for testing. */
export function applyCspReportOnlyHeaders(response: Response): void {
  const policy = getCspPolicy();
  if (policy) {
    response.headers.set("Content-Security-Policy-Report-Only", policy);
  }
}