/** Tests for the submission gate (task 12.13). Fixture-only: no live network. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { GrantVerificationClient } from "@nova/contracts/grant-verification";
import { gateSubmission, type GateResult } from "./submission-gate.js";

function stubVerify(ok: boolean, reason?: string): typeof globalThis.fetch {
  return async (): Promise<Response> => ({
    ok,
    status: ok ? 200 : 400,
    json: async () => ok ? { ok: true } : { error: reason, message: reason },
  } as unknown as Response);
}

test("valid grant allows submission", async () => {
  const client = new GrantVerificationClient({
    baseUrl: "http://localhost:3000",
    serviceName: "jobs-service",
    fetch: stubVerify(true),
  });

  const envelope = {
    jobId: "job-1",
    userId: "user-1",
    payloadHash: "a".repeat(64),
    expiry: "2026-12-13T10:00:00Z",
    nonce: "nonce-1",
    toolVersion: "v1",
  };

  const result = await gateSubmission(client, "nonce-1", envelope, "user-1", "job-1");
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "");
});

test("denied grant rejects submission", async () => {
  const client = new GrantVerificationClient({
    baseUrl: "http://localhost:3000",
    serviceName: "jobs-service",
    fetch: stubVerify(false, "payload_hash_mismatch"),
  });

  const envelope = {
    jobId: "job-1",
    userId: "user-1",
    payloadHash: "a".repeat(64),
    expiry: "2026-12-13T10:00:00Z",
    nonce: "nonce-1",
    toolVersion: "v1",
  };

  const result = await gateSubmission(client, "nonce-1", envelope, "user-1", "job-1");
  assert.equal(result.allowed, false);
  assert.ok(result.reason.includes("payload_hash_mismatch"));
});

test("fetch failure rejects submission", async () => {
  const client = new GrantVerificationClient({
    baseUrl: "http://localhost:3000",
    serviceName: "jobs-service",
    fetch: async () => { throw new Error("down"); },
  });

  const envelope = {
    jobId: "job-1",
    userId: "user-1",
    payloadHash: "a".repeat(64),
    expiry: "2026-12-13T10:00:00Z",
    nonce: "nonce-1",
    toolVersion: "v1",
  };

  const result = await gateSubmission(client, "nonce-1", envelope, "user-1", "job-1") as GateResult;
  assert.equal(result.allowed, false);
  assert.ok(result.reason.includes("down"));
});
