/** Tests for the policy decision service. */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { PolicyDecisionService } from "./policy-decision.service.js";
import { PolicyDecisionRequest } from "./policy-schema.js";

describe("policy decision service", () => {
  let service: PolicyDecisionService;

  before(() => {
    service = new PolicyDecisionService();
  });

  it("allows inbox read for own messages", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "inbox:read",
      action: "read",
      target: "own_messages",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "allow");
    assert.strictEqual(decision.ruleId, "inbox.read");
    assert.strictEqual(decision.policyVersion, 1);
  });

  it("requires approval for inbox send", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "inbox:send",
      action: "send",
      target: "external_recipients",
      payloadHash: "abc123",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.ruleId, "inbox.send");
    assert.ok(decision.approvalRequired);
    assert.strictEqual(decision.approvalRequired?.payloadHash, "abc123");
    assert.strictEqual(decision.approvalRequired?.expirySeconds, 3600);
    assert.strictEqual(decision.approvalRequired?.nonce.length, 16);
  });

  it("requires approval for calendar invite with step-up", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "calendar:invite",
      action: "invite",
      target: "external_attendees",
      payloadHash: "def456",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.ruleId, "calendar.invite");
    assert.ok(decision.approvalRequired);
  });

  it("allows tasks read and write", () => {
    const readRequest: PolicyDecisionRequest = {
      actor: "user",
      scope: "tasks:read",
      action: "read",
      target: "own_tasks",
    };
    assert.strictEqual(service.decide(readRequest).decision, "allow");

    const writeRequest: PolicyDecisionRequest = {
      actor: "user",
      scope: "tasks:write",
      action: "write",
      target: "own_tasks",
    };
    assert.strictEqual(service.decide(writeRequest).decision, "allow");
  });

  it("requires approval for finance import", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "finance:import",
      action: "import",
      target: "external_data",
      payloadHash: "fin123",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.ruleId, "finance.import");
    assert.ok(decision.approvalRequired);
  });

  it("allows jobs search", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "jobs:search",
      action: "search",
      target: "job_listings",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "allow");
    assert.strictEqual(decision.ruleId, "jobs.search");
  });

  it("requires approval for jobs apply", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "jobs:apply",
      action: "apply",
      target: "external_application",
      payloadHash: "job456",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.ruleId, "jobs.apply");
  });

  it("requires approval for channel link", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "channels:link",
      action: "link",
      target: "external_identity",
      payloadHash: "chan789",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.ruleId, "channels.link");
  });

  it("denies unknown scope", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "unknown:scope",
      action: "action",
      target: "target",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "deny");
    assert.strictEqual(decision.ruleId, "no_matching_rule");
  });

  it("denies invalid request format", () => {
    const request = {
      actor: "user",
      // missing scope, action, target
    } as PolicyDecisionRequest;
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "deny");
    assert.strictEqual(decision.ruleId, "invalid_request");
  });

  it("returns deterministic decisions for same input", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "inbox:send",
      action: "send",
      target: "external_recipients",
      payloadHash: "same_hash",
    };
    const decision1 = service.decide(request);
    const decision2 = service.decide(request);
    assert.deepStrictEqual(decision1, decision2);
  });

  it("generates different nonces for different payload hashes", () => {
    const request1: PolicyDecisionRequest = {
      actor: "user",
      scope: "inbox:send",
      action: "send",
      target: "external_recipients",
      payloadHash: "hash1",
    };
    const request2: PolicyDecisionRequest = {
      actor: "user",
      scope: "inbox:send",
      action: "send",
      target: "external_recipients",
      payloadHash: "hash2",
    };
    const decision1 = service.decide(request1);
    const decision2 = service.decide(request2);
    assert.notStrictEqual(decision1.approvalRequired?.nonce, decision2.approvalRequired?.nonce);
  });

  it("getAllRules returns all rules", () => {
    const rules = service.getAllRules();
    assert.ok(rules.length > 0);
    // 7 families with varying rules: inbox(3) + calendar(3) + tasks(2) + finance(3) + trips(2) + jobs(3) + channels(2) = 18
    assert.strictEqual(rules.length, 18);
  });

  it("getRule finds existing rule", () => {
    const rule = service.getRule("inbox.read");
    assert.ok(rule);
    assert.strictEqual(rule?.id, "inbox.read");
  });

  it("getRule returns undefined for missing rule", () => {
    const rule = service.getRule("nonexistent");
    assert.strictEqual(rule, undefined);
  });

  it("getFamilies returns all 7 families", () => {
    const families = service.getFamilies();
    assert.strictEqual(families.length, 7);
  });

  it("validateFamilies returns valid", () => {
    const result = service.validateFamilies();
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });
});