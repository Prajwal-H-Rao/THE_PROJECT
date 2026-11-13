/** Tests for the permitted-public-page extractor. Fixture-only: no live network. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { extractPublicPageListings } from "./public-page.js";
import { readJobListing, type JobListing } from "@nova/contracts/job-listing";

const HTML_WITH_JOBS = `<html><head>
<script type="application/ld+json">
[{"@type":"JobPosting","title":"Backend Engineer","identifier":"j1","url":"https://example.com/jobs/1",
 "datePosted":"2026-11-13T10:00:00Z","validThrough":"2026-12-13T10:00:00Z",
 "hiringOrganization":{"name":"Acme"}},
 {"@type":"JobPosting","title":"Frontend Engineer","identifier":"j2","url":"https://example.com/jobs/2",
  "datePosted":"2026-11-12T10:00:00Z","hiringOrganization":{"name":"Acme"}}]
</script></head><body></body></html>`;

function stubFetch(body: unknown, status = 200): typeof globalThis.fetch {
  return async (): Promise<Response> => ({
    ok: status === 200,
    status,
    text: async () => typeof body === "string" ? body : JSON.stringify(body),
  } as unknown as Response);
}

test("extracts JobPosting from JSON-LD and validates as JobListing", async () => {
  const result = await extractPublicPageListings(
    "https://example.com/careers",
    { sourceEvidenceUrl: "https://example.com/careers", reviewedAt: "2026-11-13T10:00:00Z" },
    stubFetch(HTML_WITH_JOBS),
  );
  assert.ok(Array.isArray(result));
  const listings = result as JobListing[];
  assert.equal(listings.length, 2);
  const first = listings[0]!;
  assert.equal(first.connector_id, "public_page");
  assert.equal(first.employer, "Acme");
  assert.equal(first.title, "Backend Engineer");
  assert.equal(first.source_job_id, "j1");
  assert.ok(/^[0-9a-f]{64}$/.test(first.fingerprint));
  assert.equal(first.freshness_state, "current");
  assert.equal(first.listing_status, "open");
});

test("no review record returns unsupported", async () => {
  const result = await extractPublicPageListings(
    "https://example.com/careers",
    { sourceEvidenceUrl: null, reviewedAt: null },
    stubFetch(HTML_WITH_JOBS),
  );
  assert.ok(!Array.isArray(result));
  assert.equal(result.status, "unsupported");
  assert.equal(result.reason, "no_review_record");
});

test("missing evidence URL returns unsupported", async () => {
  const result = await extractPublicPageListings(
    "https://example.com/careers",
    { sourceEvidenceUrl: "", reviewedAt: "2026-11-13T10:00:00Z" },
    stubFetch(HTML_WITH_JOBS),
  );
  assert.ok(!Array.isArray(result));
  assert.equal(result.status, "unsupported");
});

test("non-200 response returns empty list", async () => {
  const result = await extractPublicPageListings(
    "https://example.com/careers",
    { sourceEvidenceUrl: "https://example.com/careers", reviewedAt: "2026-11-13T10:00:00Z" },
    stubFetch({ error: "not found" }, 404),
  );
  assert.ok(Array.isArray(result));
  assert.equal((result as JobListing[]).length, 0);
});

test("each listing is a valid JobListing", async () => {
  const result = await extractPublicPageListings(
    "https://example.com/careers",
    { sourceEvidenceUrl: "https://example.com/careers", reviewedAt: "2026-11-13T10:00:00Z" },
    stubFetch(HTML_WITH_JOBS),
  );
  assert.ok(Array.isArray(result));
  const listings = result as JobListing[];
  for (const listing of listings) {
    const parsed = readJobListing(listing as unknown as JobListing);
    assert.ok(parsed !== null);
  }
});
