/** Tests for the span mapping module (task 12.9). */

import assert from "node:assert/strict";
import { test } from "node:test";
import { mapCandidateFields, validateJobListing, type SourceSpan } from "./span-mapping.js";

/** Build one source span. */
function span(text: string, page: number, paragraph: number, start: number, end: number): SourceSpan {
  return { text, page, paragraph, charStart: start, charEnd: end };
}

test("maps all spans to candidate fields with provenance", () => {
  const fields = mapCandidateFields({
    headline: span("Backend Engineer", 1, 1, 0, 17),
    summary: span("Experienced engineer", 1, 2, 0, 18),
    skills: span("Go, Kubernetes, SQL", 1, 3, 0, 21),
    experience: span("5 years", 1, 4, 0, 6),
    education: span("BS Computer Science", 1, 5, 0, 17),
    location: span("Bengaluru", 1, 6, 0, 9),
  });

  assert.equal(fields.headline.value, "Backend Engineer");
  assert.equal(fields.headline.method, "parser");
  assert.equal(fields.headline.confidence, 0.9);
  assert.equal(fields.headline.source_ref, "span:p1/par1/c0-17");

  assert.equal(fields.summary.value, "Experienced engineer");
  assert.equal(fields.skills.value.length, 3);
  assert.ok(fields.skills.value.includes("Go"));
  assert.ok(fields.skills.value.includes("Kubernetes"));
  assert.ok(fields.skills.value.includes("SQL"));

  assert.equal(fields.experience.value, "5 years");
  assert.equal(fields.education.value, "BS Computer Science");
  assert.equal(fields.location.value, "Bengaluru");
});

test("fields with no span are unknown", () => {
  const fields = mapCandidateFields({});

  assert.equal(fields.headline.value, "");
  assert.equal(fields.headline.source_ref, "");
  assert.equal(fields.headline.method, "unknown");
  assert.equal(fields.headline.confidence, 0);

  assert.equal(fields.summary.value, "");
  assert.equal(fields.skills.value.length, 0);
  assert.equal(fields.skills.source_ref, "");
  assert.equal(fields.experience.value, "");
  assert.equal(fields.education.value, "");
  assert.equal(fields.location.value, "");
});

test("validateJobListing passes a valid listing", () => {
  const parsed = validateJobListing({
    connector_id: "greenhouse:acme",
    canonical_uri: "https://boards.greenhouse.io/acme/jobs/1",
    employer: "Acme",
    title: "Backend Engineer",
    fingerprint: "a".repeat(64),
    last_verified_at: "2026-11-13T10:00:00Z",
    terms_classification: "unreviewed",
    source_job_id: "1",
    retrieved_at: "2026-11-13T10:00:00Z",
    freshness_state: "current",
    listing_status: "open",
  });
  assert.ok(parsed !== null);
  assert.equal(parsed.title, "Backend Engineer");
});

test("validateJobListing rejects unknown fields", () => {
  assert.equal(
    validateJobListing({ connector_id: "x", canonical_uri: "https://example.com", employer: "E", title: "T", fingerprint: "a".repeat(64), last_verified_at: "2026-11-13T10:00:00Z", terms_classification: "t", source_job_id: "1", retrieved_at: "2026-11-13T10:00:00Z", freshness_state: "current", listing_status: "open", extra: "bad" }),
    null,
  );
});
