/** Tests for the policy version management (Task 13). */

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getPolicyVersion,
  setPolicyVersion,
  bumpPolicyVersion,
  resetPolicyVersion,
  getPolicyVersionConfig,
} from "./policy-version.js";
import { PolicyDecisionService } from "./policy-decision.service.js";
import { PolicyDecisionRequest } from "./policy-schema.js";
import { GrantsService } from "../approval/grants.service.js";
import { InMemoryGrantRepository } from "../approval/grant-repository.js";
import { CreateGrantInput } from "../approval/grant-creation.js";

function createGrantInput(overrides: Partial<CreateGrantInput> = {}): CreateGrantInput {
  return {
    userId: "8f2dc4e0-3f2a-4b8e-9d11-5a9b7c2e6f01",
    service: "inbox-service",
    action: "send",
    target: "message:draft-1",
    payload: { body: "hello", to: "x@example.com" },
    ttlSeconds: 300,
    nowMs: 1_700_000_000_000,
    ...overrides,
  };
}

test("policy version: getPolicyVersion returns default 1", () => {
  resetPolicyVersion();
  assert.strictEqual(getPolicyVersion(), 1);
});

test("policy version: setPolicyVersion sets new version", () => {
  resetPolicyVersion();
  setPolicyVersion(5);
  assert.strictEqual(getPolicyVersion(), 5);
});

test("policy version: setPolicyVersion rejects invalid versions", () => {
  resetPolicyVersion();
  assert.throws(() => setPolicyVersion(0), /positive integer/);
  assert.throws(() => setPolicyVersion(-1), /positive integer/);
  assert.throws(() => setPolicyVersion(1.5), /positive integer/);
});

test("policy version: bumpPolicyVersion increments version", () => {
  resetPolicyVersion();
  assert.strictEqual(getPolicyVersion(), 1);
  bumpPolicyVersion();
  assert.strictEqual(getPolicyVersion(), 2);
  bumpPolicyVersion();
  assert.strictEqual(getPolicyVersion(), 3);
});

test("policy version: getPolicyVersionConfig returns current version", () => {
  resetPolicyVersion();
  const config = getPolicyVersionConfig();
  assert.strictEqual(config.currentVersion, 1);
  setPolicyVersion(7);
  assert.strictEqual(getPolicyVersionConfig().currentVersion, 7);
});

test("policy version: decision service uses current policy version", () => {
  resetPolicyVersion();
  const service = new PolicyDecisionService();
  const request: PolicyDecisionRequest = {
    actor: "user",
    scope: "inbox:read",
    action: "read",
    target: "own_messages",
  };
  const decision = service.decide(request);
  assert.strictEqual(decision.policyVersion, 1);
});

test("policy version: decision service reflects version bump", () => {
  resetPolicyVersion();
  const service = new PolicyDecisionService();
  const request: PolicyDecisionRequest = {
    actor: "user",
    scope: "inbox:read",
    action: "read",
    target: "own_messages",
  };
  assert.strictEqual(service.decide(request).policyVersion, 1);
  bumpPolicyVersion();
  assert.strictEqual(service.decide(request).policyVersion, 2);
  bumpPolicyVersion();
  assert.strictEqual(service.decide(request).policyVersion, 3);
});

test("policy version: grant pins current policy version", () => {
  resetPolicyVersion();
  const grantsService = new GrantsService(new InMemoryGrantRepository());
  const record = grantsService.createGrant(createGrantInput());
  assert.strictEqual(record.policyVersion, "1");
  bumpPolicyVersion();
  const record2 = grantsService.createGrant(createGrantInput());
  assert.strictEqual(record2.policyVersion, "2");
});

test("policy version: verifyBinding rejects grant with old policy version", () => {
  resetPolicyVersion();
  const grantsService = new GrantsService(new InMemoryGrantRepository());
  const record = grantsService.createGrant(createGrantInput({ nowMs: 1_700_000_000_000 }));
  const nonce = record.nonce;
  assert.strictEqual(record.policyVersion, "1");

  // Bump policy version
  bumpPolicyVersion();

  // Verify with CURRENT version (2) should fail because grant has version 1
  const verdict = grantsService.verifyGrant(nonce, {
    userId: "8f2dc4e0-3f2a-4b8e-9d11-5a9b7c2e6f01",
    service: "inbox-service",
    target: "message:draft-1",
    payload: { body: "hello", to: "x@example.com" },
    policyVersion: "2", // current version - mismatch with grant's version 1
    nowMs: 1_700_000_001_000,
  });
  assert.deepStrictEqual(verdict, { ok: false, reason: "policy_version_mismatch" });
});

test("policy version: verifyBinding accepts grant with current policy version", () => {
  resetPolicyVersion();
  const grantsService = new GrantsService(new InMemoryGrantRepository());
  bumpPolicyVersion(); // version = 2
  const record = grantsService.createGrant(createGrantInput({ nowMs: 1_700_000_000_000 }));
  const nonce = record.nonce;
  assert.strictEqual(record.policyVersion, "2");

  // Verify with current version should succeed
  const verdict = grantsService.verifyGrant(nonce, {
    userId: "8f2dc4e0-3f2a-4b8e-9d11-5a9b7c2e6f01",
    service: "inbox-service",
    target: "message:draft-1",
    payload: { body: "hello", to: "x@example.com" },
    policyVersion: "2", // current version matches grant's version
    nowMs: 1_700_000_001_000,
  });
  assert.strictEqual(verdict.ok, true);
});

test("policy version: controller get version returns current", async () => {
  resetPolicyVersion();
  const { PolicyController } = await import("./policy.controller.js");
  const { PolicyDecisionService } = await import("./policy-decision.service.js");
  const decisionService = new PolicyDecisionService();
  const controller = new PolicyController(decisionService);
  const response = await controller.getVersion();
  assert.strictEqual(response.currentVersion, 1);
});

test("policy version: controller bump version increments and returns new", async () => {
  resetPolicyVersion();
  const { PolicyController } = await import("./policy.controller.js");
  const { PolicyDecisionService } = await import("./policy-decision.service.js");
  const decisionService = new PolicyDecisionService();
  const controller = new PolicyController(decisionService);

  const response1 = await controller.bumpVersion();
  assert.strictEqual(response1.currentVersion, 2);

  const response2 = await controller.bumpVersion();
  assert.strictEqual(response2.currentVersion, 3);
});