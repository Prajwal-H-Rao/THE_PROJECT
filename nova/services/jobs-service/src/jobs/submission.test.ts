/** Tests for the submission adapter (task 12.14). */

import assert from "node:assert/strict";
import { test } from "node:test";
import { submitApplication, isDuplicateKey, clearSubmittedKeys, type SubmissionResult } from "./submission.js";

test("first submission with a key succeeds", () => {
  clearSubmittedKeys();
  const envelope = { jobId: "job-1", userId: "user-1", payloadHash: "a".repeat(64), expiry: "2026-12-13T10:00:00Z", nonce: "n1", toolVersion: "v1" };
  const result = submitApplication(envelope, "key-1") as SubmissionResult;
  assert.equal(result.submitted, true);
  assert.equal(result.reason, "");
  assert.equal(result.idempotencyKey, "key-1");
});

test("retry with same key does not double-submit", () => {
  clearSubmittedKeys();
  const envelope = { jobId: "job-1", userId: "user-1", payloadHash: "a".repeat(64), expiry: "2026-12-13T10:00:00Z", nonce: "n1", toolVersion: "v1" };
  submitApplication(envelope, "key-1");
  const result = submitApplication(envelope, "key-1") as SubmissionResult;
  assert.equal(result.submitted, false);
  assert.equal(result.reason, "duplicate");
});

test("different key submits again", () => {
  clearSubmittedKeys();
  const envelope = { jobId: "job-1", userId: "user-1", payloadHash: "a".repeat(64), expiry: "2026-12-13T10:00:00Z", nonce: "n1", toolVersion: "v1" };
  submitApplication(envelope, "key-1");
  const result = submitApplication(envelope, "key-2") as SubmissionResult;
  assert.equal(result.submitted, true);
});

test("isDuplicateKey reflects submitted keys", () => {
  clearSubmittedKeys();
  assert.equal(isDuplicateKey("key-1"), false);
  const envelope = { jobId: "job-1", userId: "user-1", payloadHash: "a".repeat(64), expiry: "2026-12-13T10:00:00Z", nonce: "n1", toolVersion: "v1" };
  submitApplication(envelope, "key-1");
  assert.equal(isDuplicateKey("key-1"), true);
});
