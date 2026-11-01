/**
 * Tests for SendService: send behind approval grant.
 * Verifies grant nonce before sending, returns provider message_id.
 * Rejects send without valid grant.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { createMockGmailAdapter } from "./gmail-adapter.js";
import { createMockGrantVerifier } from "./grant-verifier.js";
import { SendService } from "./send-service.js";

describe("SendService", () => {
  it("sends email with valid grant and returns message_id", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    const verifier = createMockGrantVerifier();
    verifier.setGrant("nonce-123", { ok: true });

    const service = new SendService(adapter, verifier, {
      userId: "user-1",
      
      policyVersion: "1",
    });

    // Create a draft using the same adapter
    const draftResult = await adapter.draft("user-1", "alice@example.com", "Hello", "Hi there");

    const sendResult = await service.send(draftResult.draftId, "nonce-123", { to: "alice@example.com" }, "message:draft-1");

    assert.ok(sendResult.messageId);
    assert.strictEqual(typeof sendResult.messageId, "string");

    const sent = adapter.getSent(sendResult.messageId);
    assert.ok(sent);
    assert.strictEqual(sent!.messageId, sendResult.messageId);
  });

  it("rejects send without valid grant", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    const verifier = createMockGrantVerifier();
    verifier.setGrant("nonce-123", { ok: false, reason: "unknown_nonce" });

    const service = new SendService(adapter, verifier, {
      userId: "user-1",
      
      policyVersion: "1",
    });

    const draftResult = await adapter.draft("user-1", "alice@example.com", "Hello", "Hi there");

    await assert.rejects(
      () => service.send(draftResult.draftId, "nonce-123", { to: "alice@example.com" }, "message:draft-1"),
      /Grant denied/
    );
  });

  it("rejects send with unknown nonce", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    const verifier = createMockGrantVerifier();
    // No grant set for "unknown-nonce"

    const service = new SendService(adapter, verifier, {
      userId: "user-1",
      
      policyVersion: "1",
    });

    const draftResult = await adapter.draft("user-1", "alice@example.com", "Hello", "Hi there");

    await assert.rejects(
      () => service.send(draftResult.draftId, "unknown-nonce", { to: "alice@example.com" }, "message:draft-1"),
      /Grant denied/
    );
  });

  it("rejects send with invalid draft", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    const verifier = createMockGrantVerifier();
    verifier.setGrant("nonce-123", { ok: true });

    const service = new SendService(adapter, verifier, {
      userId: "user-1",
      
      policyVersion: "1",
    });

    await assert.rejects(
      () => service.send("draft-nonexistent", "nonce-123", { to: "alice@example.com" }, "message:draft-1"),
      /Draft not found/
    );
  });
});
