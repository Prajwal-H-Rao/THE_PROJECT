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

  // Additional matrix row tests for full coverage (Task 15 - 10 matrix rows)
  it("allows calendar read for own events (matrix row: calendar read)", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "calendar:read",
      action: "read",
      target: "own_events",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "allow");
    assert.strictEqual(decision.ruleId, "calendar.read");
  });

  it("requires approval for inbox draft (matrix row: draft email/cover letter)", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "inbox:draft",
      action: "draft",
      target: "own_drafts",
      payloadHash: "draft123",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.ruleId, "inbox.draft");
  });

  it("allows finance read for own finances (matrix row: finance read)", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "finance:read",
      action: "read",
      target: "own_finances",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "allow");
    assert.strictEqual(decision.ruleId, "finance.read");
  });

  it("requires approval for finance categorize (matrix row: parse resume/bank file)", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "finance:write",
      action: "categorize",
      target: "own_finances",
      payloadHash: "cat123",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.ruleId, "finance.categorize");
  });

  it("requires approval for jobs match (matrix row: job match)", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "jobs:match",
      action: "match",
      target: "profile_match",
      payloadHash: "match123",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.ruleId, "jobs.match");
  });

  it("allows trips read for own trips (matrix row: trip read)", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "trips:read",
      action: "read",
      target: "own_trips",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "allow");
    assert.strictEqual(decision.ruleId, "trips.read");
  });

  it("requires approval for trips write (matrix row: trip write)", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "trips:write",
      action: "write",
      target: "own_trips",
      payloadHash: "trip123",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.ruleId, "trips.write");
  });

  it("requires approval for channels send (matrix row: channel send)", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "channels:send",
      action: "send",
      target: "external_recipient",
      payloadHash: "send123",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.ruleId, "channels.send");
    assert.ok(decision.approvalRequired?.requiresStepUp);
  });

  it("requires approval for calendar create (matrix row: calendar create)", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "calendar:write",
      action: "create",
      target: "own_calendar",
      payloadHash: "cal123",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.ruleId, "calendar.create");
  });
});