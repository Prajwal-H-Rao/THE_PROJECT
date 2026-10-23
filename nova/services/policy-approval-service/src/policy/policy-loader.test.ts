/** Tests for the policy loader. */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadFamilies, findMatchingRule, getAllRules, findRuleById } from "./policy-loader.js";
import { PolicyRule } from "./policy-schema.js";

describe("policy loader", () => {
  const config = loadFamilies();

  it("loads all 7 families", () => {
    assert.strictEqual(config.families.length, 7);
    const familyNames = config.families.map((f) => f.name).sort();
    assert.deepStrictEqual(familyNames, ["calendar", "channels", "finance", "inbox", "jobs", "tasks", "trips"]);
  });

  it("every family has at least one rule", () => {
    for (const family of config.families) {
      assert.ok(family.rules.length > 0);
    }
  });

  it("all rules are valid", () => {
    const allRules = getAllRules(config);
    for (const rule of allRules) {
      assert.ok(rule.id);
      assert.ok(rule.actor);
      assert.ok(rule.scope);
      assert.ok(rule.sensitivity);
      assert.ok(rule.target);
      assert.ok(rule.blastRadius);
      assert.ok(rule.riskTier);
      assert.ok(rule.defaultDecision);
      assert.ok(rule.version);
    }
  });

  it("finds a rule by ID", () => {
    const rule = findRuleById(config, "inbox.read");
    assert.ok(rule);
    assert.strictEqual(rule?.id, "inbox.read");
    assert.strictEqual(rule?.scope, "inbox:read");
  });

  it("returns undefined for non-existent rule ID", () => {
    const rule = findRuleById(config, "nonexistent.rule");
    assert.strictEqual(rule, undefined);
  });

  it("finds matching rule for inbox read action", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "inbox:read",
      action: "read",
      target: "own_messages",
    });
    assert.ok(rule);
    assert.strictEqual(rule?.id, "inbox.read");
    assert.strictEqual(rule?.defaultDecision, "allow");
  });

  it("finds matching rule for inbox send action (needs approval)", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "inbox:send",
      action: "send",
      target: "external_recipients",
    });
    assert.ok(rule);
    assert.strictEqual(rule?.id, "inbox.send");
    assert.strictEqual(rule?.defaultDecision, "needs_approval");
    assert.strictEqual(rule?.requiresStepUp, true);
  });

  it("finds matching rule for finance import (high sensitivity)", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "finance:import",
      action: "import",
      target: "external_data",
    });
    assert.ok(rule);
    assert.strictEqual(rule?.id, "finance.import");
    assert.strictEqual(rule?.sensitivity, "high");
    assert.strictEqual(rule?.riskTier, "tier3");
  });

  it("finds matching rule for jobs apply (high sensitivity, external)", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "jobs:apply",
      action: "apply",
      target: "external_application",
    });
    assert.ok(rule);
    assert.strictEqual(rule?.id, "jobs.apply");
    assert.strictEqual(rule?.blastRadius, "external");
    assert.strictEqual(rule?.requiresStepUp, true);
  });

  it("returns undefined for no matching rule", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "nonexistent:scope",
      action: "action",
      target: "target",
    });
    assert.strictEqual(rule, undefined);
  });

  it("tasks family defaults to allow for read/write", () => {
    const readRule = findMatchingRule(config, {
      actor: "user",
      scope: "tasks:read",
      action: "read",
      target: "own_tasks",
    });
    assert.strictEqual(readRule?.defaultDecision, "allow");

    const writeRule = findMatchingRule(config, {
      actor: "user",
      scope: "tasks:write",
      action: "write",
      target: "own_tasks",
    });
    assert.strictEqual(writeRule?.defaultDecision, "allow");
  });

  it("calendar invite requires step-up", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "calendar:invite",
      action: "invite",
      target: "external_attendees",
    });
    assert.strictEqual(rule?.id, "calendar.invite");
    assert.strictEqual(rule?.requiresStepUp, true);
    assert.strictEqual(rule?.riskTier, "tier3");
  });
});