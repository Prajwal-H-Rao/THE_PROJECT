/**
 * Greenhouse Job Board adapter (task 13.8, spec:569-575).
 * Fetches public/listed job postings from the Greenhouse Job Board GET endpoints
 * and maps them into the JobListing contract schema (task 12.1).
 * The fetch function is injected so tests can use fixtures instead of live network.
 * Security: pulls only from the configured board hostname/path (spec:577).
 * Never follows arbitrary model-supplied URLs.
 */

import { readJobListing, type JobListing } from "@nova/contracts/job-listing";
import { createHash } from "node:crypto";

/** Stable fingerprint for one listing: SHA-256 over source job ID and canonical URI. */
function fingerprintOf(sourceJobId: string, canonicalUri: string): string {
  return createHash("sha256").update(`${sourceJobId}|${canonicalUri}`, "utf8").digest("hex");
}

/** Now as an ISO timestamp. */
function nowIso(): string {
  return new Date().toISOString();
}

/** Map one Greenhouse job posting to a JobListing. Returns null when unreadable. */
function mapGreenhouseJob(board: string, job: unknown): JobListing | null {
  const record = job as Record<string, unknown>;
  const id = record["id"];
  const title = record["title"];
  const absoluteUrl = record["absolute_url"];
  const location = record["location"];
  const updatedAt = record["updated_at"];
  if (typeof id !== "number" || typeof title !== "string" || typeof absoluteUrl !== "string") {
    return null;
  }
  const sourceJobId = String(id);
  const canonicalUri = absoluteUrl;
  const listing: JobListing = {
    connector_id: "greenhouse",
    canonical_uri: canonicalUri,
    employer: board,
    title,
    location: typeof location === "object" && location !== null
      ? String((location as Record<string, unknown>)["name"] ?? "")
      : undefined,
    work_mode: undefined,
    posted_at: typeof updatedAt === "string" ? updatedAt : undefined,
    expires_at: undefined,
    fingerprint: fingerprintOf(sourceJobId, canonicalUri),
    last_verified_at: nowIso(),
    terms_classification: "unreviewed",
    source_job_id: sourceJobId,
    retrieved_at: nowIso(),
    freshness_state: "current",
    listing_status: "open",
  };
  return readJobListing(listing) === null ? null : listing;
}

/**
 * Fetch Greenhouse listings for one board.
 * board is the Greenhouse board name (e.g. "acme" for boards.greenhouse.io/acme).
 * fetch is injected; production passes globalThis.fetch, tests pass a stub.
 * Returns validated JobListing objects only; invalid postings are dropped.
 */
export async function fetchGreenhouseListings(
  board: string,
  fetch: typeof globalThis.fetch,
): Promise<JobListing[]> {
  const url = `https://boards.greenhouse.io/${board}/jobs`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return [];
  }
  if (!response.ok) {
    return [];
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return [];
  }
  const jobs = Array.isArray(body) ? body : [];
  const results: JobListing[] = [];
  for (const job of jobs) {
    const listing = mapGreenhouseJob(board, job);
    if (listing !== null) {
      results.push(listing);
    }
  }
  return results;
}
