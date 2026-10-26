/** Tests for the policy decision service chat-approval policy (Task 10). */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { PolicyDecisionService } from "./policy-decision.service.js";
import { PolicyDecisionRequest } from "./policy-schema.js";

describe("chat-approval policy (Task 10)", () => {
  let service: PolicyDecisionService;

  before(() => {
    service = new PolicyDecisionService();
  });

  it("high-risk rule (tier3) returns chat_approval_not_allowed", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "inbox:send",
      action: "send",
      target: "external_recipients",
      payloadHash: "hash123",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.chatApprovalAllowed, false);
    assert.strictEqual(decision.chatApprovalReason, "chat_approval_not_allowed");
  });

  it("high-risk rule (tier3) returns chat_approval_not_allowed for integrations send", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "integrations:send",
      action: "send",
      target: "external_recipient",
      payloadHash: "hash456",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.chatApprovalAllowed, false);
    assert.strictEqual(decision.chatApprovalReason, "chat_approval_not_allowed");
  });

  it("low-risk rule with chatApprovalAllowed=true returns chatApprovalAllowed=true", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "inbox:read",
      action: "read",
      target: "own_messages",
      payloadHash: "hash789",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "allow");
    assert.strictEqual(decision.chatApprovalAllowed, true);
    assert.strictEqual(decision.chatApprovalReason, "Chat approval allowed by policy rule");
  });

  it("medium-risk rule without chatApprovalAllowed returns requires_standard_flow", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "inbox:draft",
      action: "draft",
      target: "own_drafts",
      payloadHash: "hash999",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.chatApprovalAllowed, false);
    assert.strictEqual(decision.chatApprovalReason, "chat_approval_requires_standard_flow");
  });

  it("requests without payloadHash have undefined chat approval fields", () => {
    const request: PolicyDecisionRequest = {
      actor: "user",
      scope: "inbox:read",
      action: "read",
      target: "own_messages",
    };
    const decision = service.decide(request);
    assert.strictEqual(decision.decision, "allow");
    assert.strictEqual(decision.chatApprovalAllowed, undefined);
    assert.strictEqual(decision.chatApprovalReason, undefined);
  });
});