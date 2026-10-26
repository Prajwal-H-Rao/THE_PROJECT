/** The tests of the consumer contract. A re-delivered event is a no-op. */

import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryReceipts, InMemoryAsyncReceipts, deliverOnce, deliverTokenOnce, deliverOnceAsync, deliverTokenOnceAsync } from "./event-consumers.js";
import { decodeEnvelope, encodeEnvelope, readEnvelope } from "./event-envelope.js";
import type { EventEnvelope } from "./event-envelope.js";

const SAMPLE = {
  event_id: "b7c9d1e4-0000-4a00-8b00-111122223333",
  event_type: "note.created",
  schema_version: 1,
  occurred_at: "2026-10-23T09:00:00Z",
  producer: "notes-service",
  correlation_id: "corr-1",
  causation_id: "cause-1",
  subject_id: "note-1",
  user_id: "user-1",
};

function envelope(): EventEnvelope {
  return readEnvelope(SAMPLE) as EventEnvelope;
}

function token(): string {
  return encodeEnvelope(envelope());
}

test("the first delivery processes", () => {
  const receipts = new InMemoryReceipts();
  assert.equal(deliverOnce(envelope(), receipts), "processed");
});

test("the re-delivery of one event id is a no-op", () => {
  const receipts = new InMemoryReceipts();
  assert.equal(deliverOnce(envelope(), receipts), "processed");
  assert.equal(deliverOnce(envelope(), receipts), "duplicate");
});

test("different events process independently", () => {
  const receipts = new InMemoryReceipts();
  const first = envelope();
  const second = { ...first, eventId: "other-id" };
  assert.equal(deliverOnce(first, receipts), "processed");
  assert.equal(deliverOnce(second, receipts), "processed");
});

test("a token delivers once by its content address", () => {
  const receipts = new InMemoryReceipts();
  assert.equal(deliverTokenOnce(token(), receipts), "processed");
  assert.equal(deliverTokenOnce(token(), receipts), "duplicate");
});

test("a broken token is rejected, never recorded", () => {
  const receipts = new InMemoryReceipts();
  assert.equal(deliverTokenOnce("!!!", receipts), "rejected");
  assert.equal(receipts.hold("anything"), false);
});

test("async: the first delivery processes", async () => {
  const receipts = new InMemoryAsyncReceipts();
  assert.equal(await deliverOnceAsync(envelope(), receipts), "processed");
});

test("async: the re-delivery of one event id is a no-op", async () => {
  const receipts = new InMemoryAsyncReceipts();
  assert.equal(await deliverOnceAsync(envelope(), receipts), "processed");
  assert.equal(await deliverOnceAsync(envelope(), receipts), "duplicate");
});

test("async: different events process independently", async () => {
  const receipts = new InMemoryAsyncReceipts();
  const first = envelope();
  const second = { ...first, eventId: "other-id" };
  assert.equal(await deliverOnceAsync(first, receipts), "processed");
  assert.equal(await deliverOnceAsync(second, receipts), "processed");
});

test("async: a token delivers once by its content address", async () => {
  const receipts = new InMemoryAsyncReceipts();
  assert.equal(await deliverTokenOnceAsync(token(), receipts), "processed");
  assert.equal(await deliverTokenOnceAsync(token(), receipts), "duplicate");
});

test("async: a broken token is rejected, never recorded", async () => {
  const receipts = new InMemoryAsyncReceipts();
  assert.equal(await deliverTokenOnceAsync("!!!", receipts), "rejected");
  assert.equal(await receipts.hold("anything"), false);
});

test("async: holdAndRecord is atomic under concurrency", async () => {
  const receipts = new InMemoryAsyncReceipts();
  const eventId = "concurrent-test-" + Math.random();
  const results = await Promise.all(
    Array(10).fill(0).map(() => deliverOnceAsync({ ...envelope(), eventId }, receipts))
  );
  const processed = results.filter(r => r === "processed").length;
  const duplicate = results.filter(r => r === "duplicate").length;
  assert.equal(processed, 1);
  assert.equal(duplicate, 9);
});