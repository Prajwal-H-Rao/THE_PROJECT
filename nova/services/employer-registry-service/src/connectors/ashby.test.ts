/** Tests for the Ashby adapter. Fixture-only: no live network. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchAshbyListings } from "./ashby.js";
import { readJobListing, type JobListing } from "@nova/contracts/job-listing";

function stubFetch(body: unknown, status = 200): typeof globalThis.fetch {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    assert.ok(url.includes("listedOnly=true"), "Ashby must request listedOnly=true");
    return {
      ok: status === 200,
      status,
      json: async () => body,
    } as unknown as Response;
  };
}

test("valid postings map to JobListing and pass the contract", async () => {
  const listings = await fetchAshbyListings("widgets", stubFetch([
    { id: "1", title: "Backend Engineer", url: "https://jobs.ashbyhq.com/widgets/1",
      location: "Bengaluru", publishedAt: "2026-11-13T10:00:00Z" },
    { id: "2", title: "Frontend Engineer", url: "https://jobs.ashbyhq.com/widgets/2",
      location: "Remote", publishedAt: "2026-11-12T10:00:00Z" },
  ]));
  assert.equal(listings.length, 2);
  const first = listings[0]!;
  assert.equal(first.connector_id, "ashby");
  assert.equal(first.employer, "widgets");
  assert.equal(first.title, "Backend Engineer");
  assert.equal(first.location, "Bengaluru");
  assert.equal(first.freshness_state, "current");
  assert.equal(first.listing_status, "open");
  assert.equal(first.source_job_id, "1");
  assert.ok(/^[0-9a-f]{64}$/.test(first.fingerprint));
});

test("non-200 response returns empty list", async () => {
  const listings = await fetchAshbyListings("widgets", stubFetch({ error: "not found" }, 404));
  assert.equal(listings.length, 0);
});

test("fetch failure returns empty list", async () => {
  const listings = await fetchAshbyListings("widgets", async () => { throw new Error("down"); });
  assert.equal(listings.length, 0);
});

test("invalid postings are dropped", async () => {
  const listings = await fetchAshbyListings("widgets", stubFetch([
    { id: "1", title: "Backend Engineer", url: "https://jobs.ashbyhq.com/widgets/1",
      location: "Bengaluru", publishedAt: "2026-11-13T10:00:00Z" },
    { title: "No ID", url: "https://jobs.ashbyhq.com/widgets/2" },
    { id: "3", url: "https://jobs.ashbyhq.com/widgets/3" },
  ]));
  assert.equal(listings.length, 1);
  assert.equal(listings[0]!.title, "Backend Engineer");
});

test("each listing is a valid JobListing", async () => {
  const listings = await fetchAshbyListings("widgets", stubFetch([
    { id: "42", title: "DevOps Engineer", url: "https://jobs.ashbyhq.com/widgets/42",
      location: "Pune", publishedAt: "2026-11-01T00:00:00Z" },
  ]));
  assert.equal(listings.length, 1);
  const parsed = readJobListing(listings[0]! as unknown as JobListing);
  assert.ok(parsed !== null);
  assert.equal(parsed.fingerprint, listings[0]!.fingerprint);
});
