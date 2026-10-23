/** The step-up authentication middleware for the gateway. */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session";
import { settings } from "@/lib/settings";
import { verifyToken } from "@nova/contracts";

/** The result of a step-up check. */
export interface StepUpResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly needsStepUp?: boolean;
}

/** The step-up token payload. */
export interface StepUpClaims {
  readonly sub: string; // user id
  readonly sid: string; // session id
  readonly stepUp: true;
  readonly iat: number;
  readonly exp: number;
}

/** The step-up secret key name in settings. */
const STEP_UP_SECRET_KEY = "stepUpSecret" as const;

/** Issue a step-up token. */
export function issueStepUpToken(
  userId: string,
  sessionId: string,
  ttlSeconds: number = 300, // 5 minutes
): string {
  const current = settings();
  const secret = current[STEP_UP_SECRET_KEY];
  if (!secret) {
    throw new Error("Step-up secret not configured");
  }
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    sub: userId,
    sid: sessionId,
    stepUp: true,
    iat: now,
    exp: now + ttlSeconds,
  };
  // Reuse the session token format
  const { signPayload } = require("@nova/contracts");
  const payloadB64 = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = require("node:crypto").createHmac("sha256", secret).update("v1." + payloadB64).digest();
  return `v1.${payloadB64}.${signature.toString("base64url")}`;
}

/** Verify a step-up token. */
export function verifyStepUpToken(token: string, nowSeconds: number): { ok: boolean; claims?: { sub: string; sid: string } } {
  const current = settings();
  const secret = current[STEP_UP_SECRET_KEY];
  if (!secret) {
    return { ok: false };
  }
  
  // Reuse session token verification
  const { verifyToken } = require("@nova/contracts");
  const result = verifyToken(token, secret, { issuer: "nova-step-up", audience: "nova-internal" }, nowSeconds);
  if (!result.ok || result.claims.stepUp !== true) {
    return { ok: false };
  }
  return { ok: true, claims: { sub: result.claims.sub, sid: result.claims.sid } };
}

/** Check if a request needs step-up authentication. */
export function needsStepUp(request: Request, path: string): boolean {
  const stepUpPaths = [
    "/api/v1/users/",
    "/api/v1/settings/",
    "/api/v1/integrations/",
    "/api/v1/payments/",
    "/api/v1/admin/",
  ];
  return stepUpPaths.some(p => path.startsWith(p));
}

/** Check for step-up token in request. */
export function getStepUpToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("StepUp ")) {
    return header.slice(7).trim();
  }
  const cookie = request.headers.get("cookie");
  if (cookie) {
    const match = cookie.match(/nova_stepup=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

/** Verify step-up authentication for a request. */
export async function verifyStepUp(request: Request, path: string): Promise<{ ok: boolean; userId?: string; sessionId?: string }> {
  if (!needsStepUp(request, path)) {
    return { ok: true };
  }
  
  const token = getStepUpToken(request);
  if (!token) {
    return { ok: false };
  }
  
  const now = Math.floor(Date.now() / 1000);
  const result = verifyStepUpToken(token, now);
  if (!result.ok || !result.claims) {
    return { ok: false };
  }
  
  return { ok: true, userId: result.claims.sub, sessionId: result.claims.sid };
}