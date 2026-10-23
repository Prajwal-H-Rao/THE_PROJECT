/** Session token utilities. Mirrors the token format from api-gateway. */

import { createHmac, createHash, timingSafeEqual, randomBytes } from "node:crypto";

export const TOKEN_VERSION = "v1";

export interface SessionClaims {
  readonly sub: string;
  readonly sid: string;
  readonly tenant: string;
  readonly channel: string;
  readonly csrf: string;
  readonly iat: number;
  readonly exp: number;
}

export type Verification =
  | { readonly ok: true; readonly claims: SessionClaims }
  | { readonly ok: false; readonly reason: string };

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function isBase64Url(value: string): boolean {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return false;
  }
  return Buffer.from(value, "base64url").toString("base64url") === value;
}

function signPayload(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(TOKEN_VERSION + "." + payload).digest();
}

function digest(value: Buffer): Buffer {
  return createHash("sha256").update(value).digest();
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Issue a new session token. */
export function issueSessionToken(
  claims: Omit<SessionClaims, "iat" | "exp">,
  secret: string,
  ttlSeconds: number
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullClaims: SessionClaims = {
    ...claims,
    iat: now,
    exp: now + ttlSeconds,
  };
  const payload = Buffer.from(JSON.stringify(fullClaims), "utf8").toString("base64url");
  const signature = signPayload(payload, secret);
  return `${TOKEN_VERSION}.${payload}.${signature.toString("base64url")}`;
}

/** Verify a session token. Never throws. */
export function verifySessionToken(token: string, secret: string, nowSeconds: number): Verification {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, reason: "malformed_token" };
  }
  const [version, payload, signature] = parts;
  if (version !== TOKEN_VERSION) {
    return { ok: false, reason: "unknown_token_version" };
  }
  if (!payload || !signature || !isBase64Url(payload) || !isBase64Url(signature)) {
    return { ok: false, reason: "malformed_token" };
  }
  const expected = signPayload(payload, secret);
  const given = Buffer.from(signature, "base64url");
  if (!timingSafeEqual(digest(expected), digest(given))) {
    return { ok: false, reason: "bad_signature" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "bad_claims" };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, reason: "bad_claims" };
  }
  const record = parsed as Record<string, unknown>;
  const sub = record["sub"];
  const sid = record["sid"];
  const tenant = record["tenant"];
  const channel = record["channel"];
  const csrf = record["csrf"];
  const iat = record["iat"];
  const exp = record["exp"];
  if (!isText(sub) || !isText(sid) || !isText(tenant) || !isText(channel) || !isText(csrf)) {
    return { ok: false, reason: "bad_claims" };
  }
  if (!isNumber(iat) || !isNumber(exp)) {
    return { ok: false, reason: "bad_claims" };
  }
  if (exp <= nowSeconds) {
    return { ok: false, reason: "expired_token" };
  }
  return { ok: true, claims: { sub, sid, tenant, channel, csrf, iat, exp } };
}

/** Generate a cryptographically random session ID. */
export function generateSessionId(): string {
  return randomBytes(16).toString("base64url");
}

/** Generate a cryptographically random CSRF token. */
export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Generate a cryptographically random state parameter for OIDC. */
export function generateState(): string {
  return randomBytes(24).toString("base64url");
}

/** Generate a PKCE code verifier (43-128 chars). */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** Generate PKCE code challenge from verifier (S256 method). */
export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}