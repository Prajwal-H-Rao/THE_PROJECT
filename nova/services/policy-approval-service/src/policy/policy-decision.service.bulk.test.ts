/** Tests for the policy decision service bulk decisions (Task 14). */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { PolicyDecisionService } from "./policy-decision.service.js";
import { BulkDecisionRequest } from "./policy-bulk-schema.js";
import { resetPolicyVersion } from "./policy-version.js";
import { CallerContext } from "./authorization.js";

interface BulkDecisionItem {
  readonly actor: string;
  readonly scope: string;
  readonly action: string;
  readonly target: string;
  readonly payloadHash?: string;
}

function makeRequest(items: BulkDecisionItem[]): BulkDecisionRequest {
  return { items };
}

describe("reminder-service bulk decisions", () => {
  it("bulk: all allow actions returns allow", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "inbox:read", action: "read", target: "own_messages" },
        { actor: "user", scope: "calendar_tasks:read", action: "read", target: "own_events_tasks" },
        { actor: "user", scope: "calendar_tasks:write", action: "create_task", target: "own_tasks" },
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.decision, "allow");
    assert.strictEqual(decision.hasEscalation, false);
    assert.strictEqual(decision.items.length, 3);
    for (const item of decision.items) {
      assert.strictEqual(item.decision, "allow");
    }
  });

  it("bulk: any deny returns deny", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "inbox:read", action: "read", target: "own_messages" },
        { actor: "user", scope: "unknown:scope", action: "action", target: "target" },
        { actor: "user", scope: "calendar_tasks:read", action: "read", target: "own_events_tasks" },
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.decision, "deny");
    assert.strictEqual(decision.reason, "Batch contains denied action");
    const deniedItem = decision.items.find((i) => i.decision === "deny");
    assert.ok(deniedItem);
    assert.strictEqual(deniedItem.decision, "deny");
  });

  it("bulk: any needs_approval returns needs_approval", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "inbox:read", action: "read", target: "own_messages" },
        { actor: "user", scope: "inbox:draft", action: "draft", target: "own_drafts", payloadHash: "hash123" },
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.strictEqual(decision.reason, "Batch contains action requiring approval");
    const needsApprovalItem = decision.items.find((i) => i.decision === "needs_approval");
    assert.ok(needsApprovalItem);
  });

  it("bulk: escalation action in batch forces needs_approval", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "jobs:search", action: "search", target: "job_listings" },
        { actor: "user", scope: "jobs:apply", action: "apply", target: "external_application", payloadHash: "hash123" },
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.hasEscalation, true);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.ok(decision.reason?.includes("escalation"));
  });

  it("bulk: finance.import escalation forces needs_approval", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "finance:read", action: "read", target: "own_finances" },
        { actor: "user", scope: "finance:import", action: "import", target: "external_data", payloadHash: "hash456" },
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.hasEscalation, true);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.ok(decision.reason?.includes("escalation"));
  });

  it("bulk: integrations.link escalation forces needs_approval", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "integrations:send", action: "send", target: "external_recipient", payloadHash: "hash1" },
        { actor: "user", scope: "integrations:link", action: "link", target: "external_identity", payloadHash: "hash2" },
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.hasEscalation, true);
    assert.strictEqual(decision.decision, "needs_approval");
    assert.ok(decision.reason?.includes("escalation"));
  });

  it("bulk: inbox.send escalation forces needs_approval", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "inbox:read", action: "read", target: "own_messages" },
        { actor: "user", scope: "inbox:send", action: "send", target: "external_recipients", payloadHash: "hash123" },
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.hasEscalation, true);
    assert.strictEqual(decision.decision, "needs_approval");
  });

  it("bulk: empty items array is rejected", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = { items: [] };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.decision, "deny");
    assert.strictEqual(decision.reason, "Invalid bulk decision request format");
  });

  it("bulk: invalid item in batch is rejected", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "inbox:read", action: "read", target: "own_messages" },
        { actor: "user" } as any,
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.decision, "deny");
    assert.strictEqual(decision.reason, "Invalid bulk decision request format");
  });

  it("bulk: item results contain correct metadata", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "inbox:read", action: "read", target: "own_messages", payloadHash: "hash1" },
        { actor: "user", scope: "inbox:send", action: "send", target: "external_recipients", payloadHash: "hash2" },
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.items.length, 2);
    const item0 = decision.items[0];
    const item1 = decision.items[1];
    assert.ok(item0);
    assert.ok(item1);
    assert.strictEqual(item0.index, 0);
    assert.strictEqual(item0.ruleId, "inbox.read");
    assert.strictEqual(item0.decision, "allow");
    assert.strictEqual(item1.index, 1);
    assert.strictEqual(item1.ruleId, "inbox.send");
    assert.strictEqual(item1.decision, "needs_approval");
    assert.ok(item1.approvalRequired);
    assert.strictEqual(item1.approvalRequired?.payloadHash, "hash2");
  });

  it("bulk: chat approval metadata preserved in results", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "inbox:read", action: "read", target: "own_messages", payloadHash: "hash1" },
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    const item = decision.items[0];
    assert.ok(item);
    assert.strictEqual(item.chatApprovalAllowed, true);
    assert.strictEqual(item.chatApprovalReason, "Chat approval allowed by policy rule");
  });

  it("bulk: high-risk action without payloadHash returns deny with chat_approval_not_allowed", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "inbox:send", action: "send", target: "external_recipients" },
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.decision, "needs_approval");
    const item = decision.items[0];
    assert.ok(item);
    assert.strictEqual(item.chatApprovalAllowed, false);
    assert.strictEqual(item.chatApprovalReason, "chat_approval_not_allowed");
  });

  it("bulk: response includes policyVersion and hasEscalation", () => {
    const service = new PolicyDecisionService();
    const request: BulkDecisionRequest = {
      items: [
        { actor: "user", scope: "inbox:read", action: "read", target: "own_messages" },
        { actor: "user", scope: "jobs:apply", action: "apply", target: "external_application", payloadHash: "hash123" },
      ],
    };
    const caller = { service: "test", scopes: [], userId: "test-user", resourceOwnerId: undefined };
    const decision = service.decideBulk(request, caller);
    assert.strictEqual(decision.policyVersion, 1);
    assert.strictEqual(decision.hasEscalation, true);
    assert.ok(decision.reason);
  });
});
