/** Tests for the SmartRecruiters adapter. Fixture-only: no live network. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchSmartRecruitersListings, type UnsupportedResult } from "./smartrecruiters.js";
import { readJobListing, type JobListing } from "@nova/contracts/job-listing";

function stubFetch(body: unknown, status = 200): typeof globalThis.fetch {
  return async (): Promise<Response> => ({
    ok: status === 200,
    status,
    json: async () => body,
  } as unknown as Response);
}

test("valid postings map to JobListing and pass the contract", async () => {
  const result = await fetchSmartRecruitersListings("widgets", stubFetch({
    tier: "standard",
    content: [
      { id: "1", name: "Backend Engineer", ref: "https://careers.smartrecruiters.com/widgets/1",
        location: { city: "Bengaluru" }, publishedAt: "2026-11-13T10:00:00Z" },
      { id: "2", name: "Frontend Engineer", ref: "https://careers.smartrecruiters.com/widgets/2",
        location: { city: "Remote" }, publishedAt: "2026-11-12T10:00:00Z" },
    ],
  }));
  assert.ok(Array.isArray(result));
  const listings = result as JobListing[];
  assert.equal(listings.length, 2);
  const first = listings[0]!;
  assert.equal(first.connector_id, "smartrecruiters");
  assert.equal(first.employer, "widgets");
  assert.equal(first.title, "Backend Engineer");
  assert.equal(first.location, "Bengaluru");
  assert.equal(first.freshness_state, "current");
  assert.equal(first.listing_status, "open");
  assert.equal(first.source_job_id, "1");
  assert.ok(/^[0-9a-f]{64}$/.test(first.fingerprint));
});

test("missing tier returns unsupported, not an error", async () => {
  const result = await fetchSmartRecruitersListings("widgets", stubFetch({ content: [] }));
  assert.ok(!Array.isArray(result));
  const unsupported = result as UnsupportedResult;
  assert.equal(unsupported.status, "unsupported");
  assert.equal(unsupported.company, "widgets");
});

test("unsupported tier returns unsupported, not an error", async () => {
  const result = await fetchSmartRecruitersListings("widgets", stubFetch({ tier: "unsupported", content: [] }));
  assert.ok(!Array.isArray(result));
  const unsupported = result as UnsupportedResult;
  assert.equal(unsupported.status, "unsupported");
  assert.equal(unsupported.company, "widgets");
});

test("non-200 response returns empty list", async () => {
  const result = await fetchSmartRecruitersListings("widgets", stubFetch({ error: "not found" }, 404));
  assert.ok(Array.isArray(result));
  assert.equal((result as JobListing[]).length, 0);
});

test("fetch failure returns empty list", async () => {
  const result = await fetchSmartRecruitersListings("widgets", async () => { throw new Error("down"); });
  assert.ok(Array.isArray(result));
  assert.equal((result as JobListing[]).length, 0);
});

test("invalid postings are dropped", async () => {
  const result = await fetchSmartRecruitersListings("widgets", stubFetch({
    tier: "standard",
    content: [
      { id: "1", name: "Backend Engineer", ref: "https://careers.smartrecruiters.com/widgets/1",
        location: { city: "Bengaluru" }, publishedAt: "2026-11-13T10:00:00Z" },
      { name: "No ID", ref: "https://careers.smartrecruiters.com/widgets/2" },
      { id: "3", ref: "https://careers.smartrecruiters.com/widgets/3" },
    ],
  }));
  assert.ok(Array.isArray(result));
  const listings = result as JobListing[];
  assert.equal(listings.length, 1);
  assert.equal(listings[0]!.title, "Backend Engineer");
});

test("each listing is a valid JobListing", async () => {
  const result = await fetchSmartRecruitersListings("widgets", stubFetch({
    tier: "standard",
    content: [
      { id: "42", name: "DevOps Engineer", ref: "https://careers.smartrecruiters.com/widgets/42",
        location: { city: "Pune" }, publishedAt: "2026-11-01T00:00:00Z" },
    ],
  }));
  assert.ok(Array.isArray(result));
  const listings = result as JobListing[];
  assert.equal(listings.length, 1);
  const parsed = readJobListing(listings[0]! as unknown as JobListing);
  assert.ok(parsed !== null);
  assert.equal(parsed.fingerprint, listings[0]!.fingerprint);
});
