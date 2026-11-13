/** Tests for the Lever adapter. Fixture-only: no live network. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchLeverListings } from "./lever.js";
import { readJobListing, type JobListing } from "@nova/contracts/job-listing";

function stubFetch(body: unknown, status = 200): typeof globalThis.fetch {
  const calls: string[] = [];
  const fn = async (input: string | URL | Request): Promise<Response> => {
    calls.push(String(input));
    return {
      ok: status === 200,
      status,
      json: async () => body,
    } as unknown as Response;
  };
  (fn as unknown as Record<string, unknown>).calls = calls;
  return fn as typeof globalThis.fetch;
}

test("valid postings map to JobListing and pass the contract", async () => {
  const listings = await fetchLeverListings("acme", stubFetch([
    { id: "1", text: "Backend Engineer", hostedUrl: "https://jobs.lever.co/acme/1",
      categories: { location: "Bengaluru" }, createdAt: "2026-11-13T10:00:00Z" },
    { id: "2", text: "Frontend Engineer", hostedUrl: "https://jobs.lever.co/acme/2",
      categories: { location: "Remote" }, createdAt: "2026-11-12T10:00:00Z" },
  ]));
  assert.equal(listings.length, 2);
  const first = listings[0]!;
  assert.equal(first.connector_id, "lever");
  assert.equal(first.employer, "acme");
  assert.equal(first.title, "Backend Engineer");
  assert.equal(first.location, "Bengaluru");
  assert.equal(first.freshness_state, "current");
  assert.equal(first.listing_status, "open");
  assert.equal(first.source_job_id, "1");
  assert.ok(/^[0-9a-f]{64}$/.test(first.fingerprint));
});

test("non-200 response returns empty list", async () => {
  const listings = await fetchLeverListings("acme", stubFetch({ error: "not found" }, 404));
  assert.equal(listings.length, 0);
});

test("fetch failure returns empty list", async () => {
  const listings = await fetchLeverListings("acme", async () => { throw new Error("down"); });
  assert.equal(listings.length, 0);
});

test("invalid postings are dropped", async () => {
  const listings = await fetchLeverListings("acme", stubFetch([
    { id: "1", text: "Backend Engineer", hostedUrl: "https://jobs.lever.co/acme/1",
      categories: { location: "Bengaluru" }, createdAt: "2026-11-13T10:00:00Z" },
    { text: "No ID", hostedUrl: "https://jobs.lever.co/acme/2" },
    { id: "3", hostedUrl: "https://jobs.lever.co/acme/3" },
  ]));
  assert.equal(listings.length, 1);
  assert.equal(listings[0]!.title, "Backend Engineer");
});

test("each listing is a valid JobListing", async () => {
  const listings = await fetchLeverListings("acme", stubFetch([
    { id: "42", text: "DevOps Engineer", hostedUrl: "https://jobs.lever.co/acme/42",
      categories: { location: "Pune" }, createdAt: "2026-11-01T00:00:00Z" },
  ]));
  assert.equal(listings.length, 1);
  const parsed = readJobListing(listings[0]! as unknown as JobListing);
  assert.ok(parsed !== null);
  assert.equal(parsed.fingerprint, listings[0]!.fingerprint);
});
