/** Tests for the job listing contract. Every rejection path has one case. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { readJobListing } from "./job-listing.js";

/** Build one valid minimal listing. Tests mutate it per case. */
function baseListing(): Record<string, unknown> {
  return {
    connector_id: "greenhouse:acme",
    canonical_uri: "https://boards.greenhouse.io/acme/jobs/123",
    employer: "Acme",
    title: "Backend Engineer",
    fingerprint: "a".repeat(64),
    last_verified_at: "2026-11-13T10:00:00Z",
    terms_classification: "public_ats_board",
    source_job_id: "123",
    retrieved_at: "2026-11-13T10:00:00Z",
    freshness_state: "current",
    listing_status: "open",
  };
}

test("a minimal valid listing passes", () => {
  const parsed = readJobListing(baseListing());
  assert.ok(parsed !== null);
  assert.equal(parsed.title, "Backend Engineer");
});

test("a full listing with every optional field passes", () => {
  const full = {
    ...baseListing(),
    employer_id: "acme-uuid",
    location: "Bengaluru, IN",
    work_mode: "hybrid",
    posted_at: "2026-11-01T00:00:00Z",
    expires_at: "2026-12-01T00:00:00Z",
  };
  const parsed = readJobListing(full);
  assert.ok(parsed !== null);
  assert.equal(parsed.work_mode, "hybrid");
  assert.equal(parsed.expires_at, "2026-12-01T00:00:00Z");
});

test("an unknown field fails", () => {
  const listing = { ...baseListing(), confidence: 0.9 };
  assert.equal(readJobListing(listing), null);
});

test("a missing required field fails", () => {
  const listing = { ...baseListing() };
  delete listing["fingerprint"];
  assert.equal(readJobListing(listing), null);
});

test("a non-object input fails", () => {
  assert.equal(readJobListing(null), null);
  assert.equal(readJobListing("listing"), null);
});

test("a bad fingerprint fails", () => {
  assert.equal(readJobListing({ ...baseListing(), fingerprint: "abc" }), null);
  assert.equal(readJobListing({ ...baseListing(), fingerprint: "A".repeat(64) }), null);
});

test("a bad work_mode fails", () => {
  assert.equal(readJobListing({ ...baseListing(), work_mode: "anywhere" }), null);
});

test("an empty terms_classification fails", () => {
  assert.equal(readJobListing({ ...baseListing(), terms_classification: "" }), null);
});

test("a malformed canonical_uri fails", () => {
  assert.equal(readJobListing({ ...baseListing(), canonical_uri: "not a url" }), null);
  assert.equal(readJobListing({ ...baseListing(), canonical_uri: "ftp://x/y" }), null);
});

test("a malformed timestamp fails", () => {
  assert.equal(readJobListing({ ...baseListing(), last_verified_at: "soon" }), null);
  assert.equal(readJobListing({ ...baseListing(), retrieved_at: "" }), null);
});

test("a bad freshness_state or listing_status fails", () => {
  assert.equal(readJobListing({ ...baseListing(), freshness_state: "fresh" }), null);
  assert.equal(readJobListing({ ...baseListing(), listing_status: "maybe" }), null);
});
