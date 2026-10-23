/** Tests for the policy schema validation. */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validatePolicyRule, validateDecisionRequest, PolicyRule } from "./policy-schema.js";

describe("policy schema validation", () => {
  const validRule: PolicyRule = {
    id: "test.rule",
    actor: "user",
    scope: "test:scope",
    sensitivity: "medium",
    target: "test_target",
    blastRadius: "self",
    riskTier: "tier2",
    defaultDecision: "needs_approval",
    version: 1,
  };

  it("validates a correct policy rule", () => {
    assert.strictEqual(validatePolicyRule(validRule), true);
  });

  it("rejects a rule missing required fields", () => {
    const { id, ...missingId } = validRule;
    assert.strictEqual(validatePolicyRule(missingId), false);
  });

  it("rejects a rule with invalid sensitivity", () => {
    assert.strictEqual(validatePolicyRule({ ...validRule, sensitivity: "extreme" }), false);
  });

  it("rejects a rule with invalid blastRadius", () => {
    assert.strictEqual(validatePolicyRule({ ...validRule, blastRadius: "global" }), false);
  });

  it("rejects a rule with invalid riskTier", () => {
    assert.strictEqual(validatePolicyRule({ ...validRule, riskTier: "tier5" }), false);
  });

  it("rejects a rule with invalid defaultDecision", () => {
    assert.strictEqual(validatePolicyRule({ ...validRule, defaultDecision: "maybe" }), false);
  });

  it("rejects a rule with non-integer version", () => {
    assert.strictEqual(validatePolicyRule({ ...validRule, version: 1.5 }), false);
  });

  it("rejects a rule with unknown extra fields", () => {
    assert.strictEqual(validatePolicyRule({ ...validRule, unknownField: "value" }), false);
  });

  it("accepts optional fields", () => {
    assert.strictEqual(
      validatePolicyRule({
        ...validRule,
        requiresStepUp: true,
        allowedActions: ["action1", "action2"],
      }),
      true
    );
  });
});

describe("decision request validation", () => {
  const validRequest = {
    actor: "user",
    scope: "inbox:read",
    action: "read",
    target: "own_messages",
  };

  it("validates a correct decision request", () => {
    assert.strictEqual(validateDecisionRequest(validRequest), true);
  });

  it("rejects a request missing required fields", () => {
    const { actor, ...missingActor } = validRequest;
    assert.strictEqual(validateDecisionRequest(missingActor), false);
  });

  it("rejects a request with invalid sensitivity", () => {
    assert.strictEqual(
      validateDecisionRequest({ ...validRequest, sensitivity: "extreme" }),
      false
    );
  });

  it("accepts optional payloadHash", () => {
    assert.strictEqual(
      validateDecisionRequest({ ...validRequest, payloadHash: "abc123" }),
      true
    );
  });

  it("rejects non-string payloadHash", () => {
    assert.strictEqual(
      validateDecisionRequest({ ...validRequest, payloadHash: 123 }),
      false
    );
  });

  it("rejects non-object input", () => {
    assert.strictEqual(validateDecisionRequest("not an object"), false);
    assert.strictEqual(validateDecisionRequest(null), false);
  });
});