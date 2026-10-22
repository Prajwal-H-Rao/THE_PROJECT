/** The service identity contract. One signed service JWT names one workload call. */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** The algorithm the contract pins. Every other algorithm value is a rejection. */
export const TOKEN_ALGORITHM = "HS256";

/** The default lifetime of one service token in seconds. */
export const DEFAULT_TOKEN_TTL_SECONDS = 300;

/** The header block of a service token in its trusted shape. */
export interface ServiceTokenHeader {
  readonly alg: string;
  readonly typ: string;
}

/** The claims of one service token. */
export interface ServiceClaims {
  readonly iss: string;
  readonly aud: string;
  readonly sub: string;
  readonly scope: string;
  readonly iat: number;
  readonly exp: number;
}

/** The result of a verification. A rejection carries a reason code and no secret. */
export type ServiceVerification =
  | { readonly ok: true; readonly claims: ServiceClaims }
  | { readonly ok: false; readonly reason: string };

/** The options of one verification. The caller pins the audience and the issuer. */
export interface VerifyOptions {
  readonly issuer: string;
  readonly audience: string;
  readonly requiredScope?: string;
}

/** The pattern that a base64url part must match. */
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** Base64url of one JSON value without padding. */
function encode(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

/** Return true when the value is a text that holds no empty string. */
function isText(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

/** Return true when the value is a finite number. */
function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Sign one covered string. The secret stays in the environment of the caller. */
export function signPayload(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

/** The digest of a signature buffer. Every digest holds exactly 32 bytes. */
function digest(value: Buffer): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Issue one service token. The caller supplies the claims, the secret and the clock. */
export function issueToken(
  claims: { readonly iss: string; readonly aud: string; readonly sub: string;
    readonly scope: string; readonly ttlSeconds?: number },
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const ttl = claims.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS;
  const header: ServiceTokenHeader = { alg: TOKEN_ALGORITHM, typ: "JWT" };
  const body: ServiceClaims = { iss: claims.iss, aud: claims.aud, sub: claims.sub,
    scope: claims.scope, iat: nowSeconds, exp: nowSeconds + ttl };
  // WHY: the covered string includes the header, so an algorithm swap breaks the signature.
  const covered = encode(header) + "." + encode(body);
  return covered + "." + signPayload(covered, secret).toString("base64url");
}

/** Read and parse a token part. A malformed part is a rejection, never a throw. */
function decodePart(part: string): Record<string, unknown> | null {
  if (!BASE64URL.test(part)) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Verify a service token. It never throws and its reason codes name no secret. */
export function verifyToken(
  token: string,
  secret: string,
  options: VerifyOptions,
  nowSeconds: number,
): ServiceVerification {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, reason: "malformed_token" };
  }
  const head = parts[0];
  const body = parts[1];
  const signature = parts[2];
  if (head === undefined || body === undefined || signature === undefined) {
    return { ok: false, reason: "malformed_token" };
  }
  const headerRecord = decodePart(head);
  const headerAlg = headerRecord === null ? null : headerRecord["alg"];
  const headerType = headerRecord === null ? null : headerRecord["typ"];
  // WHY: an unsigned call names alg none. The fixed pin rejects every other algorithm.
  if (headerAlg !== TOKEN_ALGORITHM) {
    return { ok: false, reason: "unsupported_algorithm" };
  }
  if (headerType !== "JWT") {
    return { ok: false, reason: "bad_header" };
  }
  const claimed = signPayload(head + "." + body, secret);
  const given = Buffer.from(signature, "base64url");
  // WHY: both digests hold 32 bytes, so the comparison never throws and never leaks a length.
  if (!timingSafeEqual(digest(claimed), digest(given))) {
    return { ok: false, reason: "bad_signature" };
  }
  const record = decodePart(body);
  if (record === null) {
    return { ok: false, reason: "bad_claims" };
  }
  const claims = readClaims(record);
  if (claims === null) {
    return { ok: false, reason: "bad_claims" };
  }
  if (claims.exp <= nowSeconds) {
    return { ok: false, reason: "expired_token" };
  }
  if (claims.iss !== options.issuer) {
    return { ok: false, reason: "unknown_issuer" };
  }
  if (claims.aud !== options.audience) {
    return { ok: false, reason: "unknown_audience" };
  }
  const required = options.requiredScope;
  if (required !== undefined) {
    const scopes = claims.scope.split(" ");
    if (!scopes.includes(required)) {
      return { ok: false, reason: "missing_scope" };
    }
  }
  return { ok: true, claims };
}

/** Build the claims of one record, or null when a field is missing or wrongly typed. */
export function readClaims(record: Record<string, unknown>): ServiceClaims | null {
  const recordIss = record["iss"];
  const recordAud = record["aud"];
  const recordSub = record["sub"];
  const recordScope = record["scope"];
  const recordIat = record["iat"];
  const recordExp = record["exp"];
  if (!isText(recordIss) || !isText(recordAud) || !isText(recordSub) || !isText(recordScope)) {
    return null;
  }
  // WHY: a scope list with a doubled space would let an empty scope through the split.
  if (recordScope.includes("  ") || recordScope.startsWith(" ") || recordScope.endsWith(" ")) {
    return null;
  }
  if (!isNumber(recordIat) || !isNumber(recordExp)) {
    return null;
  }
  return { iss: recordIss, aud: recordAud, sub: recordSub, scope: recordScope,
    iat: recordIat, exp: recordExp };
}
