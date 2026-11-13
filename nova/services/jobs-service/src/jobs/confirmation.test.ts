/** Tests for the confirmation record (task 12.15). */

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildConfirmation, hasEvidence, isStatusUnknown, type ConfirmationRecord } from "./confirmation.js";

test("acknowledged when both provider reference and evidence present", () => {
  const envelope = { jobId: "job-1", userId: "user-1", payloadHash: "a".repeat(64), expiry: "2026-12-13T10:00:00Z", nonce: "n1", toolVersion: "v1" };
  const record = buildConfirmation("sub-1", envelope, "prov-ref-1", "response-body-1");
  assert.equal(record.status, "acknowledged");
  assert.equal(record.providerReference, "prov-ref-1");
  assert.equal(record.responseEvidence, "response-body-1");
  assert.ok(hasEvidence(record));
  assert.equal(isStatusUnknown(record), false);
});

test("status_unknown when no evidence", () => {
  const envelope = { jobId: "job-1", userId: "user-1", payloadHash: "a".repeat(64), expiry: "2026-12-13T10:00:00Z", nonce: "n1", toolVersion: "v1" };
  const record = buildConfirmation("sub-1", envelope, null, null);
  assert.equal(record.status, "status_unknown");
  assert.equal(hasEvidence(record), false);
  assert.equal(isStatusUnknown(record), true);
});

test("status_unknown when only provider reference", () => {
  const envelope = { jobId: "job-1", userId: "user-1", payloadHash: "a".repeat(64), expiry: "2026-12-13T10:00:00Z", nonce: "n1", toolVersion: "v1" };
  const record = buildConfirmation("sub-1", envelope, "prov-ref-1", null);
  assert.equal(record.status, "status_unknown");
  assert.equal(hasEvidence(record), false);
  assert.equal(isStatusUnknown(record), true);
});

test("record has submission id and confirmed timestamp", () => {
  const envelope = { jobId: "job-1", userId: "user-1", payloadHash: "a".repeat(64), expiry: "2026-12-13T10:00:00Z", nonce: "n1", toolVersion: "v1" };
  const record = buildConfirmation("sub-1", envelope, "prov-ref-1", "evidence");
  assert.equal(record.submissionId, "sub-1");
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(record.confirmedAt));
});
