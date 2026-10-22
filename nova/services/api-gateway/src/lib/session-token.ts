/** The session token format and its verifier. The gateway holds no signer. */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** The version of the token format. */
export const TOKEN_VERSION = "v1";

/** The claims of one session. */
export interface SessionClaims {
  readonly sub: string;
  readonly sid: string;
  readonly tenant: string;
  readonly channel: string;
  readonly csrf: string;
  readonly iat: number;
  readonly exp: number;
}

/** The result of a verification. A rejection carries a reason code. */
export type Verification =
  | { readonly ok: true; readonly claims: SessionClaims }
  | { readonly ok: false; readonly reason: string };

/** The pattern that a base64url value must match. */
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** Compute the signature of a payload part. */
export function signPayload(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(TOKEN_VERSION + "." + payload).digest();
}

/** Verify a session token. It never throws. */
export function verifyToken(token: string, secret: string, nowSeconds: number): Verification {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, reason: "malformed_token" };
  }
  const version = parts[0];
  const payload = parts[1];
  const signature = parts[2];
  if (version === undefined || payload === undefined || signature === undefined) {
    return { ok: false, reason: "malformed_token" };
  }
  if (version !== TOKEN_VERSION) {
    return { ok: false, reason: "unknown_token_version" };
  }
  if (!isBase64Url(payload) || !isBase64Url(signature)) {
    return { ok: false, reason: "malformed_token" };
  }
  const expected = signPayload(payload, secret);
  const given = Buffer.from(signature, "base64url");
  // WHY: both digests hold 32 bytes, so the comparison never throws and never leaks a length.
  if (!timingSafeEqual(digest(expected), digest(given))) {
    return { ok: false, reason: "bad_signature" };
  }
  const claims = readClaims(payload);
  if (claims === null) {
    return { ok: false, reason: "bad_claims" };
  }
  if (claims.exp <= nowSeconds) {
    return { ok: false, reason: "expired_token" };
  }
  return { ok: true, claims };
}

/** Return the claims of a payload part, or null when they are bad. */
export function readClaims(payload: string): SessionClaims | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
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
    return null;
  }
  if (!isNumber(iat) || !isNumber(exp)) {
    return null;
  }
  return { sub, sid, tenant, channel, csrf, iat, exp };
}

/** Return true when the value is a base64url string in its canonical form. */
export function isBase64Url(value: string): boolean {
  if (!BASE64URL.test(value)) {
    return false;
  }
  return Buffer.from(value, "base64url").toString("base64url") === value;
}

/** Return the digest of a buffer. The digest always holds 32 bytes. */
export function digest(value: Buffer): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Return true when the value is a text that holds no empty string. */
function isText(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

/** Return true when the value is a finite number. */
function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
