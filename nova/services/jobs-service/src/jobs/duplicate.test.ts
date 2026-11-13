/** Tests for duplicate detection (task 12.18). */

import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDuplicate, type ExistingApplication } from "./duplicate.js";

test("no duplicate when user has no applications", () => {
  const result = checkDuplicate("user-1", "listing-1", "job-1", []);
  assert.equal(result.duplicate, false);
  assert.equal(result.reason, "");
});

test("duplicate when same user applies to same listing", () => {
  const existing: ExistingApplication[] = [
    { userId: "user-1", listingId: "listing-1", jobId: "job-1" },
  ];
  const result = checkDuplicate("user-1", "listing-1", "job-1", existing);
  assert.equal(result.duplicate, true);
  assert.ok(result.reason.includes("second application to one job is rejected"));
  assert.ok(result.existing !== undefined);
  assert.equal(result.existing.jobId, "job-1");
});

test("duplicate when same user applies to same job via different listing", () => {
  const existing: ExistingApplication[] = [
    { userId: "user-1", listingId: "listing-old", jobId: "job-1" },
  ];
  const result = checkDuplicate("user-1", "listing-new", "job-1", existing);
  assert.equal(result.duplicate, true);
});

test("no duplicate when different user applies to same job", () => {
  const existing: ExistingApplication[] = [
    { userId: "user-1", listingId: "listing-1", jobId: "job-1" },
  ];
  const result = checkDuplicate("user-2", "listing-1", "job-1", existing);
  assert.equal(result.duplicate, false);
});

test("no duplicate when same user applies to different job", () => {
  const existing: ExistingApplication[] = [
    { userId: "user-1", listingId: "listing-1", jobId: "job-1" },
  ];
  const result = checkDuplicate("user-1", "listing-2", "job-2", existing);
  assert.equal(result.duplicate, false);
});
