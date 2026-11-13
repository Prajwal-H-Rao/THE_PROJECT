/** Tests for the Greenhouse adapter. Fixture-only: no live network. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchGreenhouseListings } from "./greenhouse.js";
import { readJobListing, type JobListing } from "@nova/contracts/job-listing";

function stubFetch(body: unknown, status = 200): typeof globalThis.fetch {
  return async (input: string | URL | Request): Promise<Response> => ({
    ok: status === 200,
    status,
    json: async () => body,
  } as unknown as Response);
}

test("valid postings map to JobListing and pass the contract", async () => {
  const listings = await fetchGreenhouseListings("acme", stubFetch([
    { id: 1, title: "Backend Engineer", absolute_url: "https://boards.greenhouse.io/acme/jobs/1",
      location: { name: "Bengaluru" }, updated_at: "2026-11-13T10:00:00Z" },
    { id: 2, title: "Frontend Engineer", absolute_url: "https://boards.greenhouse.io/acme/jobs/2",
      location: { name: "Remote" }, updated_at: "2026-11-12T10:00:00Z" },
  ]));
  assert.equal(listings.length, 2);
  const first = listings[0]!;
  assert.equal(first.connector_id, "greenhouse");
  assert.equal(first.employer, "acme");
  assert.equal(first.title, "Backend Engineer");
  assert.equal(first.location, "Bengaluru");
  assert.equal(first.freshness_state, "current");
  assert.equal(first.listing_status, "open");
  assert.equal(first.source_job_id, "1");
  assert.equal(first.canonical_uri, "https://boards.greenhouse.io/acme/jobs/1");
  assert.ok(/^[0-9a-f]{64}$/.test(first.fingerprint));
});

test("non-200 response returns empty list", async () => {
  const listings = await fetchGreenhouseListings("acme", stubFetch({ error: "not found" }, 404));
  assert.equal(listings.length, 0);
});

test("fetch failure returns empty list", async () => {
  const listings = await fetchGreenhouseListings("acme", async () => { throw new Error("down"); });
  assert.equal(listings.length, 0);
});

test("invalid postings are dropped", async () => {
  const listings = await fetchGreenhouseListings("acme", stubFetch([
    { id: 1, title: "Backend Engineer", absolute_url: "https://boards.greenhouse.io/acme/jobs/1",
      location: { name: "Bengaluru" }, updated_at: "2026-11-13T10:00:00Z" },
    { title: "No ID", absolute_url: "https://boards.greenhouse.io/acme/jobs/2" },
    { id: 3, absolute_url: "https://boards.greenhouse.io/acme/jobs/3" },
  ]));
  assert.equal(listings.length, 1);
  assert.equal(listings[0]!.title, "Backend Engineer");
});

test("each listing is a valid JobListing", async () => {
  const listings = await fetchGreenhouseListings("acme", stubFetch([
    { id: 42, title: "DevOps Engineer", absolute_url: "https://boards.greenhouse.io/acme/jobs/42",
      location: { name: "Pune" }, updated_at: "2026-11-01T00:00:00Z" },
  ]));
  assert.equal(listings.length, 1);
  const parsed = readJobListing(listings[0]! as unknown as JobListing);
  assert.ok(parsed !== null);
  assert.equal(parsed.fingerprint, listings[0]!.fingerprint);
});
