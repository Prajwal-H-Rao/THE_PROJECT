/** Tests for the session token service. */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { issueSessionToken, verifySessionToken, generateSessionId, generateCsrfToken, SessionClaims } from "./session.tokens.js";

describe("session token service", () => {
  const secret = "test-secret-at-least-32-bytes-long";
  const ttlSeconds = 3600;
  const baseClaims: Omit<SessionClaims, "iat" | "exp"> = {
    sub: "user-123",
    sid: "session-456",
    tenant: "tenant-789",
    channel: "web",
    csrf: "csrf-token-abc",
  };

  it("issues a valid session token", () => {
    const token = issueSessionToken(baseClaims, secret, ttlSeconds);
    assert.ok(typeof token === "string");
    assert.ok(token.startsWith("v1."));
    const parts = token.split(".");
    assert.strictEqual(parts.length, 3);
  });

  it("verifies a valid token", () => {
    const token = issueSessionToken(baseClaims, secret, ttlSeconds);
    const now = Math.floor(Date.now() / 1000);
    const result = verifySessionToken(token, secret, now);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.claims.sub, baseClaims.sub);
      assert.strictEqual(result.claims.sid, baseClaims.sid);
      assert.strictEqual(result.claims.tenant, baseClaims.tenant);
      assert.strictEqual(result.claims.channel, baseClaims.channel);
      assert.strictEqual(result.claims.csrf, baseClaims.csrf);
    }
  });

  it("rejects token with wrong secret", () => {
    const token = issueSessionToken(baseClaims, secret, ttlSeconds);
    const now = Math.floor(Date.now() / 1000);
    const result = verifySessionToken(token, "wrong-secret", now);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, "bad_signature");
  });

  it("rejects expired token", () => {
    const expiredToken = issueSessionToken(baseClaims, secret, -10); // 10 seconds ago
    const now = Math.floor(Date.now() / 1000);
    const result = verifySessionToken(expiredToken, secret, now);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, "expired_token");
  });

  it("rejects malformed token", () => {
    const now = Math.floor(Date.now() / 1000);
    const result = verifySessionToken("not.a.valid.token", secret, now);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, "malformed_token");
  });

  it("rejects token with unknown version", () => {
    const now = Math.floor(Date.now() / 1000);
    const result = verifySessionToken("v2.payload.signature", secret, now);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, "unknown_token_version");
  });

  it("generates unique session IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateSessionId());
    }
    assert.strictEqual(ids.size, 100);
  });

  it("generates unique CSRF tokens", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateCsrfToken());
    }
    assert.strictEqual(tokens.size, 100);
  });

  it("verifies token with correct claims", () => {
    const token = issueSessionToken(baseClaims, secret, ttlSeconds);
    const now = Math.floor(Date.now() / 1000);
    const result = verifySessionToken(token, secret, now);
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.claims.iat, now);
      assert.ok(result.claims.exp > now);
      assert.ok(result.claims.exp <= now + 3600);
    }
  });
});