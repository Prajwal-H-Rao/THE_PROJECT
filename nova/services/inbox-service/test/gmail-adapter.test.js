/**
 * Contract test for GmailAdapter: list, get and search operations.
 * Verifies read-only operations return structured results.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { createMockGmailAdapter } from "../gmail/gmail-adapter.js";
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
        assert.strictEqual(result.messages[0].subject, "Project update");
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
});
