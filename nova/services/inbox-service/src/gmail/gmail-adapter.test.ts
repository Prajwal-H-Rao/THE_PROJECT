/**
 * Contract test for GmailAdapter: list, get and search operations.
 * Verifies read-only operations return structured results.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { createMockGmailAdapter } from "./gmail-adapter.js";

describe("GmailAdapter contract", () => {
  it("list returns messages and total", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    adapter.addMessage({
      id: "msg-1",
      threadId: "thread-1",
      from: "alice@example.com",
      to: ["bob@example.com"],
      subject: "Hello",
      snippet: "Hi there",
      receivedAt: "2026-10-01T10:00:00Z",
      labels: ["INBOX"],
      bodyRef: null,
    });

    const result = await adapter.list("user-1", "", 10);

    assert.ok(Array.isArray(result.messages));
    assert.strictEqual(result.messages.length, 1);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.messages[0].id, "msg-1");
    assert.strictEqual(result.messages[0].from, "alice@example.com");
  });

  it("get returns one message by id", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    adapter.addMessage({
      id: "msg-2",
      threadId: "thread-2",
      from: "carol@example.com",
      to: ["dave@example.com"],
      subject: "Meeting",
      snippet: "Discuss plan",
      receivedAt: "2026-10-02T11:00:00Z",
      labels: ["INBOX"],
      bodyRef: null,
    });

    const result = await adapter.get("user-1", "msg-2");

    assert.strictEqual(result.message.id, "msg-2");
    assert.strictEqual(result.message.subject, "Meeting");
  });

  it("get throws when message not found", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });

    await assert.rejects(() => adapter.get("user-1", "missing"), /Message not found/);
  });

  it("search returns matching messages", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    adapter.addMessage({
      id: "msg-3",
      threadId: "thread-3",
      from: "eve@example.com",
      to: ["frank@example.com"],
      subject: "Project update",
      snippet: "Status report",
      receivedAt: "2026-10-03T12:00:00Z",
      labels: ["INBOX"],
      bodyRef: null,
    });

    const result = await adapter.search("user-1", "Project", 10);

    assert.strictEqual(result.total, 1);
    const first = result.messages[0];
    assert.ok(first);
    assert.strictEqual(first!.subject, "Project update");
  });

  it("search returns zero for no match", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    adapter.addMessage({
      id: "msg-4",
      threadId: "thread-4",
      from: "grace@example.com",
      to: ["heidi@example.com"],
      subject: "Invoice",
      snippet: "Payment due",
      receivedAt: "2026-10-04T13:00:00Z",
      labels: ["INBOX"],
      bodyRef: null,
    });

    const result = await adapter.search("user-1", "zzz", 10);

    assert.strictEqual(result.total, 0);
    assert.strictEqual(result.messages.length, 0);
  });

  it("list pages with pageToken", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    for (let i = 1; i <= 5; i++) {
      adapter.addMessage({ id: `msg-${i}`, from: `u${i}@x.com`, subject: `S${i}`, snippet: "", receivedAt: "t", labels: [], bodyRef: null });
    }

    const page1 = await adapter.list("user-1", "", 2);
    assert.strictEqual(page1.messages.length, 2);
    assert.ok(page1.nextPageToken);

    const page2 = await adapter.list("user-1", "", 2, page1.nextPageToken);
    assert.strictEqual(page2.messages.length, 2);
    assert.ok(page2.nextPageToken);

    const page3 = await adapter.list("user-1", "", 2, page2.nextPageToken);
    assert.strictEqual(page3.messages.length, 1);
    assert.strictEqual(page3.nextPageToken, null);
  });

  it("draft creates a draft and returns draft_id", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });

    const result = await adapter.draft("user-1", "alice@example.com", "Hello", "Hi there");

    assert.ok(result.draftId);
    assert.strictEqual(typeof result.draftId, "string");
    assert.ok(result.draftId.startsWith("draft-"));

    const draft = adapter.getDraft(result.draftId);
    assert.ok(draft);
    assert.strictEqual(draft!.to, "alice@example.com");
    assert.strictEqual(draft!.subject, "Hello");
    assert.strictEqual(draft!.body, "Hi there");
  });

  it("send returns provider message_id", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });
    const draftResult = await adapter.draft("user-1", "alice@example.com", "Hello", "Hi there");

    const sendResult = await adapter.send("user-1", draftResult.draftId);

    assert.ok(sendResult.messageId);
    assert.strictEqual(typeof sendResult.messageId, "string");
    assert.ok(sendResult.messageId.startsWith("msg-"));

    const sent = adapter.getSent(sendResult.messageId);
    assert.ok(sent);
    assert.strictEqual(sent!.messageId, sendResult.messageId);
  });

  it("send throws when draft not found", async () => {
    const adapter = createMockGmailAdapter({ userId: "user-1" });

    await assert.rejects(() => adapter.send("user-1", "draft-nonexistent"), /Draft not found/);
  });
});
