/** Tests for the grant verification helper. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { GrantVerificationClient } from "./grant-verification.js";
import { GrantVerificationError, computeApprovalHash, canonicalPayload } from "./grant-verification-types.js";

/** Mock fetch implementation for testing. */
function createMockFetch(responses: Map<string, { status: number; body: unknown }>) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const method = "GET"; // We only use GET/POST in tests
    const key = `${init?.method ?? "GET"} ${url}`;
    const response = responses.get(key);
    if (!response) {
      return new Response(JSON.stringify({ error: "not_found", message: "Mock not found" }), { status: 404 });
    }
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  };
}

test("GrantVerificationClient: verifyGrant success", async () => {
  const mockFetch = createMockFetch(new Map([
    ["POST http://policy:3000/policy/grants/abc123/verify", {
      status: 200,
      body: { ok: true }
    }]
  ]));

  const client = new GrantVerificationClient({
    baseUrl: "http://policy:3000",
    serviceName: "inbox-service",
    fetch: mockFetch,
  });

  const result = await client.verifyGrant("abc123", {
    userId: "user-123",
    target: "message:draft-1",
    payload: { body: "hello" },
    policyVersion: "1",
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, undefined);
});

test("GrantVerificationClient: verifyGrant failure with reason", async () => {
  const mockFetch = createMockFetch(new Map([
    ["POST http://policy:3000/policy/grants/abc123/verify", {
      status: 200,
      body: { ok: false, reason: "payload_hash_mismatch" }
    }]
  ]));

  const client = new GrantVerificationClient({
    baseUrl: "http://policy:3000",
    serviceName: "inbox-service",
    fetch: mockFetch,
  });

  const result = await client.verifyGrant("abc123", {
    userId: "user-123",
    target: "message:draft-1",
    payload: { body: "different" },
    policyVersion: "1",
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "payload_hash_mismatch");
});

test("GrantVerificationClient: consumeGrant success", async () => {
  const mockFetch = createMockFetch(new Map([
    ["POST http://policy:3000/policy/grants/abc123/consume", {
      status: 200,
      body: { ok: true, consumedAtMs: 1700000000000 }
    }]
  ]));

  const client = new GrantVerificationClient({
    baseUrl: "http://policy:3000",
    serviceName: "inbox-service",
    fetch: mockFetch,
  });

  const result = await client.consumeGrant("abc123");
  assert.equal(result.ok, true);
  assert.equal(result.consumedAtMs, 1700000000000);
});

test("GrantVerificationClient: consumeGrant already used", async () => {
  const mockFetch = createMockFetch(new Map([
    ["POST http://policy:3000/policy/grants/abc123/consume", {
      status: 200,
      body: { ok: false, reason: "already_used" }
    }]
  ]));

  const client = new GrantVerificationClient({
    baseUrl: "http://policy:3000",
    serviceName: "inbox-service",
    fetch: mockFetch,
  });

  const result = await client.consumeGrant("abc123");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "already_used");
});

test("GrantVerificationClient: getGrantCard success", async () => {
  const mockFetch = createMockFetch(new Map([
    ["GET http://policy:3000/policy/grants/abc123/card?service=inbox-service", {
      status: 200,
      body: {
        target: "message:draft-1",
        preview: { body: "hello" },
        permissions: ["send"],
        consequence: "Medium risk: may modify own data",
        expiresAtMs: 1700000000000,
        cardHash: "abc123"
      }
    }]
  ]));

  const client = new GrantVerificationClient({
    baseUrl: "http://policy:3000",
    serviceName: "inbox-service",
    fetch: mockFetch,
  });

  const card = await client.getGrantCard("abc123");
  assert.ok(card);
  assert.equal(card.target, "message:draft-1");
  assert.equal(card.permissions[0], "send");
});

test("GrantVerificationClient: getGrantCard 404 returns null", async () => {
  const mockFetch = createMockFetch(new Map([
    ["GET http://policy:3000/policy/grants/abc123/card?service=inbox-service", {
      status: 404,
      body: { error: "no_preview", message: "Grant not found" }
    }]
  ]));

  const client = new GrantVerificationClient({
    baseUrl: "http://policy:3000",
    serviceName: "inbox-service",
    fetch: mockFetch,
  });

  const card = await client.getGrantCard("abc123");
  assert.equal(card, null);
});

test("GrantVerificationClient: verifyAndConsume flow", async () => {
  const mockFetch = createMockFetch(new Map([
    ["POST http://policy:3000/policy/grants/abc123/verify", {
      status: 200,
      body: { ok: true }
    }],
    ["POST http://policy:3000/policy/grants/abc123/consume", {
      status: 200,
      body: { ok: true, consumedAtMs: 1700000000000 }
    }]
  ]));

  const client = new GrantVerificationClient({
    baseUrl: "http://policy:3000",
    serviceName: "inbox-service",
    fetch: mockFetch,
  });

  const result = await client.verifyAndConsume("abc123", {
    userId: "user-123",
    target: "message:draft-1",
    payload: { body: "hello" },
    policyVersion: "1",
  });

  assert.equal(result.ok, true);
  assert.equal(result.consumedAtMs, 1700000000000);
});

test("GrantVerificationClient: verifyAndConsume fails fast on verify failure", async () => {
  const mockFetch = createMockFetch(new Map([
    ["POST http://policy:3000/policy/grants/abc123/verify", {
      status: 200,
      body: { ok: false, reason: "expired" }
    }]
  ]));

  const client = new GrantVerificationClient({
    baseUrl: "http://policy:3000",
    serviceName: "inbox-service",
    fetch: mockFetch,
  });

  const result = await client.verifyAndConsume("abc123", {
    userId: "user-123",
    target: "message:draft-1",
    payload: { body: "hello" },
    policyVersion: "1",
  });

  assert.equal(result.ok, false);
  // verifyAndConsume maps verify reasons to consume-compatible reasons
  assert.equal(result.reason, "already_used");
  assert.equal(result.verifyReason, "expired");
});

test("GrantVerificationClient: error handling for non-OK responses", async () => {
  const mockFetch = createMockFetch(new Map([
    ["POST http://policy:3000/policy/grants/invalid/verify", {
      status: 400,
      body: { error: "invalid_nonce", message: "nonce must be a 32-char hex string" }
    }]
  ]));

  const client = new GrantVerificationClient({
    baseUrl: "http://policy:3000",
    serviceName: "inbox-service",
    fetch: mockFetch,
  });

  try {
    await client.verifyGrant("invalid", {
      userId: "user-123",
      target: "message:draft-1",
      payload: { body: "hello" },
      policyVersion: "1",
    });
    assert.fail("should have thrown");
  } catch (error) {
    assert.ok(error instanceof GrantVerificationError);
    assert.equal((error as GrantVerificationError).code, "invalid_nonce");
    assert.equal((error as GrantVerificationError).status, 400);
  }
});

test("static verifyPreviewHash matches computeApprovalHash", () => {
  const preview = { body: "hello", to: "x@example.com" };
  const cardHash = computeApprovalHash(preview);
  assert.equal(GrantVerificationClient.verifyPreviewHash(preview, cardHash), true);
  assert.equal(GrantVerificationClient.verifyPreviewHash({ ...preview, body: "changed" }, cardHash), false);
});

test("createGrantVerificationClient uses env vars", async () => {
  const originalUrl = process.env.POLICY_APPROVAL_SERVICE_URL;
  const originalService = process.env.SERVICE_NAME;
  
  process.env.POLICY_APPROVAL_SERVICE_URL = "http://custom:3000";
  process.env.SERVICE_NAME = "test-service";
  
  const { createGrantVerificationClient } = await import("./grant-verification.js");
  const client = createGrantVerificationClient();
  // Can't easily test private fields, but we can verify it doesn't throw
  assert.ok(client instanceof GrantVerificationClient);
  
  // Clean up
  delete process.env.POLICY_APPROVAL_SERVICE_URL;
  delete process.env.SERVICE_NAME;
});