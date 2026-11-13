/**
 * Tests for the Telegram webhook route (task 14.8).
 * Verifies secret token validation, deduplication, and update forwarding.
 */

import * as assert from "node:assert";
import { test } from "node:test";
import { WebhookRoute } from "./webhook.route.js";
import { Validator } from "./validator.js";
import { OffsetStore } from "./offset-store.js";

// Mock fetch to avoid actual HTTP requests to inbox service
const originalFetch = globalThis.fetch;
globalThis.fetch = async () =>
  new Response(JSON.stringify({ ok: true }), { status: 200 }) as any;

function makeRoute(secretToken = "my-secret"): WebhookRoute {
  const validator = new Validator(secretToken);
  const offsetStore = new OffsetStore();
  return new WebhookRoute(secretToken, validator, offsetStore);
}

function makeRequest(
  secretToken: string | undefined,
  body: unknown,
): Request {
  return new Request("https://example.com/webhooks/telegram", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secretToken !== undefined
        ? { "x-telegram-bot-api-secret-token": secretToken }
        : {}),
    },
    body: JSON.stringify(body),
  });
}

test("accepts a valid webhook with correct secret token", async () => {
  const route = makeRoute("my-secret");
  const result = await route.handleWebhook(
    makeRequest("my-secret", { update_id: 1, message: { text: "Hello" } }),
    { update_id: 1, message: { text: "Hello" } },
  );
  assert.equal(result.ok, true);
});

test("rejects a webhook with wrong secret token", async () => {
  const route = makeRoute("my-secret");
  await assert.rejects(
    () =>
      route.handleWebhook(
        makeRequest("wrong-secret", { update_id: 1 }),
        { update_id: 1 },
      ),
    (err: Error) => err.message.includes("Invalid secret token")
  );
});

test("rejects a webhook with no secret token", async () => {
  const route = makeRoute("my-secret");
  await assert.rejects(
    () =>
      route.handleWebhook(makeRequest(undefined, { update_id: 1 }), {
        update_id: 1,
      }),
    (err: Error) => err.message.includes("Invalid secret token")
  );
});

test("rejects a duplicate update_id", async () => {
  const route = makeRoute("my-secret");
  await route.handleWebhook(
    makeRequest("my-secret", { update_id: 1 }),
    { update_id: 1 },
  );
  await assert.rejects(
    () =>
      route.handleWebhook(
        makeRequest("my-secret", { update_id: 1 }),
        { update_id: 1 },
      ),
    (err: Error) => err.message.includes("Duplicate update")
  );
});

test("accepts a new update_id after a previous one", async () => {
  const route = makeRoute("my-secret");
  await route.handleWebhook(
    makeRequest("my-secret", { update_id: 1 }),
    { update_id: 1 },
  );
  const result = await route.handleWebhook(
    makeRequest("my-secret", { update_id: 2, message: { text: "Second" } }),
    { update_id: 2, message: { text: "Second" } },
  );
  assert.equal(result.ok, true);
});

test("rejects an update with no update_id", async () => {
  const route = makeRoute("my-secret");
  await assert.rejects(
    () =>
      route.handleWebhook(
        makeRequest("my-secret", { message: { text: "Hello" } }),
        { message: { text: "Hello" } },
      ),
    (err: Error) => err.message.includes("Missing update_id")
  );
});
