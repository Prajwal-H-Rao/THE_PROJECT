/**
 * Tests for DraftService: draft creation without sending.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { createMockGmailAdapter } from "./gmail-adapter.js";
import { DraftService } from "./draft-service.js";

describe("DraftService", () => {
  it("creates a draft and returns draft_id", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    const service = new DraftService(adapter, { userId: "user-1" });

    const result = await service.draft("alice@example.com", "Hello", "Hi there");

    assert.ok(result.draftId);
    assert.strictEqual(typeof result.draftId, "string");
    assert.ok(result.draftId.startsWith("draft-"));

    const draft = adapter.getDraft(result.draftId);
    assert.ok(draft);
    assert.strictEqual(draft!.to, "alice@example.com");
    assert.strictEqual(draft!.subject, "Hello");
    assert.strictEqual(draft!.body, "Hi there");
  });

  it("does not send the draft", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    const service = new DraftService(adapter, { userId: "user-1" });

    await service.draft("alice@example.com", "Hello", "Hi there");

    const sent = adapter.getSent("any-message-id");
    assert.strictEqual(sent, null);
  });
});
