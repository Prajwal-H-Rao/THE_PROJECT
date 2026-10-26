/** Tests for the policy loader. */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadFamilies, findMatchingRule, getAllRules, findRuleById } from "./policy-loader.js";
import { PolicyRule } from "./policy-schema.js";

describe("policy loader", () => {
  const config = loadFamilies();

  it("loads all 7 canonical families", () => {
    assert.strictEqual(config.families.length, 7);
    const familyNames = config.families.map((f) => f.name).sort();
    assert.deepStrictEqual(familyNames, ["calendar_tasks", "finance", "inbox", "integrations", "notes_memory", "resume_jobs", "trips"]);
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

  it("finds matching rule for resume_jobs apply (high sensitivity, external)", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "jobs:apply",
      action: "apply",
      target: "external_application",
    });
    assert.ok(rule);
    assert.strictEqual(rule?.id, "resume_jobs.apply");
    assert.strictEqual(rule?.blastRadius, "external");
    assert.strictEqual(rule?.requiresStepUp, true);
  });

  it("finds matching rule for notes_memory search", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "notes:search",
      action: "search",
      target: "own_notes",
    });
    assert.ok(rule);
    assert.strictEqual(rule?.id, "notes_memory.search");
    assert.strictEqual(rule?.defaultDecision, "allow");
  });

  it("finds matching rule for integrations link (step-up)", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "integrations:link",
      action: "link",
      target: "external_identity",
    });
    assert.ok(rule);
    assert.strictEqual(rule?.id, "integrations.link");
    assert.strictEqual(rule?.requiresStepUp, true);
    assert.strictEqual(rule?.riskTier, "tier3");
  });

  it("finds matching rule for calendar_tasks read", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "calendar_tasks:read",
      action: "read",
      target: "own_events_tasks",
    });
    assert.ok(rule);
    assert.strictEqual(rule?.id, "calendar_tasks.read");
    assert.strictEqual(rule?.defaultDecision, "allow");
  });

  it("finds matching rule for calendar_tasks create_event (needs approval)", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "calendar_tasks:write",
      action: "create_event",
      target: "own_calendar",
    });
    assert.ok(rule);
    assert.strictEqual(rule?.id, "calendar_tasks.create_event");
    assert.strictEqual(rule?.defaultDecision, "needs_approval");
  });

  it("finds matching rule for calendar_tasks create_task (allow)", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "calendar_tasks:write",
      action: "create_task",
      target: "own_tasks",
    });
    assert.ok(rule);
    assert.strictEqual(rule?.id, "calendar_tasks.create_task");
    assert.strictEqual(rule?.defaultDecision, "allow");
  });

  it("finds matching rule for calendar_tasks invite (step-up)", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "calendar_tasks:invite",
      action: "invite",
      target: "external_attendees",
    });
    assert.ok(rule);
    assert.strictEqual(rule?.id, "calendar_tasks.invite");
    assert.strictEqual(rule?.requiresStepUp, true);
    assert.strictEqual(rule?.riskTier, "tier3");
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

  it("calendar_tasks family defaults to allow for read/create_task", () => {
    const readRule = findMatchingRule(config, {
      actor: "user",
      scope: "calendar_tasks:read",
      action: "read",
      target: "own_events_tasks",
    });
    assert.strictEqual(readRule?.defaultDecision, "allow");

    const createTaskRule = findMatchingRule(config, {
      actor: "user",
      scope: "calendar_tasks:write",
      action: "create_task",
      target: "own_tasks",
    });
    assert.strictEqual(createTaskRule?.defaultDecision, "allow");
  });

  it("calendar_tasks invite requires step-up", () => {
    const rule = findMatchingRule(config, {
      actor: "user",
      scope: "calendar_tasks:invite",
      action: "invite",
      target: "external_attendees",
    });
    assert.strictEqual(rule?.id, "calendar_tasks.invite");
    assert.strictEqual(rule?.requiresStepUp, true);
    assert.strictEqual(rule?.riskTier, "tier3");
  });
});