/** The tests of the service identity contract. Every rejection reason gets a case. */

import assert from "node:assert/strict";
import test from "node:test";

import { issueToken, readClaims, signPayload, verifyToken } from "./service-token.js";
import type { ServiceClaims } from "./service-token.js";

// The secret length matches the gateway rule: at least 32 bytes.
const SECRET = "test-secret-for-the-service-tokens-00";
const NOW = 1_700_000_000;
const OPTIONS = { issuer: "nova.test", audience: "nova-internal" };

const CLAIMS = { iss: "nova.test", aud: "nova-internal", sub: "jobs-service",
  scope: "jobs.write" };

function issued(): ServiceClaims {
  return { iss: CLAIMS.iss, aud: CLAIMS.aud, sub: CLAIMS.sub, scope: CLAIMS.scope,
    iat: NOW, exp: NOW + 300 };
}

function freshToken(): string {
  return issueToken({ iss: CLAIMS.iss, aud: CLAIMS.aud, sub: CLAIMS.sub,
    scope: CLAIMS.scope }, SECRET, NOW);
}

function verify(token: string, secret: string = SECRET) {
  return verifyToken(token, secret, OPTIONS, NOW + 1);
}

test("a valid token verifies", () => {
  const result = verify(freshToken());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.claims.iss, CLAIMS.iss);
    assert.equal(result.claims.exp, NOW + 300);
  }
});

test("alg none is rejected", () => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }), "utf8")
    .toString("base64url");
  const body = Buffer.from(JSON.stringify(issued()), "utf8").toString("base64url");
  const result = verify(header + "." + body + ".");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "unsupported_algorithm");
  }
});

test("a wrong algorithm is rejected", () => {
  const header = Buffer.from(JSON.stringify({ alg: "HS512", typ: "JWT" }), "utf8")
    .toString("base64url");
  const token = header + "." + Buffer.from(JSON.stringify(issued()), "utf8")
    .toString("base64url") + ".Cg==";
  assert.equal(verify(token).ok, false);
});

test("a foreign signing key is rejected", () => {
  const result = verify(freshToken(), "another-secret-of-32-bytes-exactly-0000000");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "bad_signature");
  }
});

test("an unknown issuer is rejected", () => {
  const token = issueToken({ ...CLAIMS, iss: "stranger.test" }, SECRET, NOW);
  const result = verify(token);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "unknown_issuer");
  }
});

test("an unknown audience is rejected", () => {
  const token = issueToken({ ...CLAIMS, aud: "other-audience" }, SECRET, NOW);
  const result = verify(token);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "unknown_audience");
  }
});

test("an expired token is rejected", () => {
  const token = issueToken({ ...CLAIMS, ttlSeconds: 300 }, SECRET, NOW);
  const late = verifyToken(token, SECRET, OPTIONS, NOW + 301);
  assert.equal(late.ok, false);
  if (!late.ok) {
    assert.equal(late.reason, "expired_token");
  }
});

test("a missing scope is rejected when the caller requires one", () => {
  const token = issueToken({ ...CLAIMS, scope: "jobs.read" }, SECRET, NOW);
  const result = verifyToken(token, SECRET, { ...OPTIONS, requiredScope: "jobs.write" },
    NOW + 1);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "missing_scope");
  }
});

test("a required scope that the token holds passes", () => {
  const token = issueToken({ ...CLAIMS, scope: "jobs.write profile.read" }, SECRET, NOW);
  const result = verifyToken(token, SECRET, { ...OPTIONS, requiredScope: "profile.read" },
    NOW + 1);
  assert.equal(result.ok, true);
});

test("a malformed token is rejected", () => {
  assert.equal(verify("not-a-token").ok, false);
  assert.equal(verify("a.b").ok, false);
});

test("claims of a bad payload read as null", () => {
  assert.equal(readClaims({ iss: "", aud: "a", sub: "s", scope: "x", iat: 1, exp: 2 }), null);
  assert.equal(readClaims({ iss: "i", aud: "a", sub: "s", scope: "x", iat: "1", exp: 2 }), null);
});

test("the signature covers the header and stays byte-exact", () => {
  const token = freshToken();
  const [head, body, signature] = token.split(".");
  assert.ok(head && body && signature);
  const expected = signPayload(head + "." + body, SECRET);
  assert.equal(Buffer.from(signature, "base64url").equals(expected), true);
});
