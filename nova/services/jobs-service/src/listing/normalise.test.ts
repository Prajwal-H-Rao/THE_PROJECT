/** Tests for the listing normaliser. The core proof: every field carries source and freshness. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { normaliseListing } from "./normalise.js";
import { type RawListing, type SourceProvenance } from "./normalise-types.js";

/** Build one raw listing with two sourced fields and requirements text. */
function rawListing(): RawListing {
  return {
    connector_id: "greenhouse:acme",
    canonical_uri: "https://boards.greenhouse.io/acme/jobs/123",
    employer: "Acme",
    fields: {
      title: { value: "Senior Backend Engineer", source_ref: "row/1/title", method: "ats_api", confidence: 1 },
      location: { value: "Bengaluru", source_ref: "row/1/location", method: "ats_api", confidence: 1 },
      work_mode: { value: "hybrid", source_ref: "row/1/ workplace", method: "parsed", confidence: 0.9 },
      salary_max: { value: "4500000", source_ref: "row/1/salary", method: "parsed", confidence: 0.8 },
    },
    requirements_text: "5+ years with Go and Kubernetes. Must have work authorisation. Clearance not required.",
  };
}

/** Build one source provenance record. */
function provenance(): SourceProvenance {
  return {
    source_job_id: "123",
    retrieved_at: "2026-11-13T10:00:00Z",
    last_verified_at: "2026-11-13T10:00:00Z",
    fingerprint: "a".repeat(64),
    freshness_state: "current",
    listing_status: "open",
  };
}

test("every normalised field carries source and freshness", () => {
  const out = normaliseListing(rawListing(), provenance());
  const fields: unknown[] = [
    out.title, out.location, out.work_mode, out.salary_max,
    out.role_family, out.experience_years, out.sponsorship, out.skills,
  ];
  for (const field of fields) {
    if (field === null) {
      continue;
    }
    const record = field as Record<string, unknown>;
    const source = record["source"] as Record<string, unknown>;
    const freshness = record["freshness"] as Record<string, unknown>;
    assert.ok(source !== undefined, "field misses source");
    assert.ok(freshness !== undefined, "field misses freshness");
    assert.ok(typeof source["source_ref"] === "string" && source["source_ref"] !== "");
    assert.ok(typeof source["method"] === "string" && source["method"] !== "");
    assert.equal(freshness["retrieved_at"], "2026-11-13T10:00:00Z");
    assert.equal(freshness["state"], "current");
  }
});

test("the assembled listing passes the contract validator", () => {
  const out = normaliseListing(rawListing(), provenance());
  assert.equal(out.listing.title, "Senior Backend Engineer");
  assert.equal(out.listing.connector_id, "greenhouse:acme");
  assert.equal(out.listing.freshness_state, "current");
});

test("sourced fields keep their raw provenance", () => {
  const out = normaliseListing(rawListing(), provenance());
  assert.equal(out.location?.source.method, "ats_api");
  assert.equal(out.location?.source.confidence, 1);
  assert.equal(out.work_mode?.source.source_ref, "row/1/ workplace");
});

test("derived fields carry the derived method and lower confidence", () => {
  const out = normaliseListing(rawListing(), provenance());
  assert.equal(out.skills.source.method, "derived");
  assert.equal(out.skills.source.confidence, 0.7);
});

test("skills tokenise from the requirements text", () => {
  const out = normaliseListing(rawListing(), provenance());
  assert.ok(out.skills.value.includes("go"));
  assert.ok(out.skills.value.includes("kubernetes"));
  assert.ok(out.skills.value.includes("authorisation"));
});

test("experience years parse from the requirements text", () => {
  const out = normaliseListing(rawListing(), provenance());
  assert.equal(out.experience_years.value, 5);
});

test("sponsorship classifies from the requirements text", () => {
  const out = normaliseListing(rawListing(), provenance());
  assert.equal(out.sponsorship.value, "sponsorship");
});

test("the role family derives from the title", () => {
  const out = normaliseListing(rawListing(), provenance());
  assert.equal(out.role_family.value, "backend");
});

test("an unknown field name throws", () => {
  const raw = rawListing();
  const fields = { ...raw.fields, bonus: { value: "x", source_ref: "r", method: "m", confidence: 1 } };
  assert.throws(() => normaliseListing({ ...raw, fields }, provenance()), /unknown field name/);
});

test("a contract-invalid listing throws", () => {
  const raw = rawListing();
  const fields = { ...raw.fields };
  delete fields["title"];
  assert.throws(() => normaliseListing({ ...raw, fields }, provenance()), /fails the contract/);
});
