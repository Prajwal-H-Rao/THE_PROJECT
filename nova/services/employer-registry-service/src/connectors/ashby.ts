/**
 * Ashby public posting adapter (task 13.10, spec:569-575).
 * Fetches public job postings from Ashby's public job-posting API.
 * Requests listedOnly=true so unlisted postings are never exposed.
 * Maps results into the JobListing contract schema (task 12.1).
 * fetch is injected; tests use fixtures. Pulls only from jobs.ashbyhq.com (spec:577).
 */

import { readJobListing, type JobListing } from "@nova/contracts/job-listing";
import { createHash } from "node:crypto";

function fingerprintOf(sourceJobId: string, canonicalUri: string): string {
  return createHash("sha256").update(`${sourceJobId}|${canonicalUri}`, "utf8").digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapAshbyPosting(company: string, posting: unknown): JobListing | null {
  const record = posting as Record<string, unknown>;
  const id = record["id"];
  const title = record["title"];
  const url = record["url"];
  const location = record["location"];
  const publishedAt = record["publishedAt"];
  if (typeof id !== "string" || typeof title !== "string" || typeof url !== "string") {
    return null;
  }
  const sourceJobId = id;
  const canonicalUri = url;
  const listing: JobListing = {
    connector_id: "ashby",
    canonical_uri: canonicalUri,
    employer: company,
    title,
    location: typeof location === "string" ? location : undefined,
    work_mode: undefined,
    posted_at: typeof publishedAt === "string" ? publishedAt : undefined,
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

async function fetchJson(url: string, fetch: typeof globalThis.fetch): Promise<unknown[]> {
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
  return Array.isArray(body) ? body : [];
}

/**
 * Fetch Ashby listings for one company. Requests listedOnly=true so unlisted
 * postings are never exposed (spec:569).
 */
export async function fetchAshbyListings(
  company: string,
  fetch: typeof globalThis.fetch,
): Promise<JobListing[]> {
  const url = `https://jobs.ashbyhq.com/api/postings/job-postings?listedOnly=true&compassId=${company}`;
  const jobs = await fetchJson(url, fetch);
  const results: JobListing[] = [];
  for (const job of jobs) {
    const listing = mapAshbyPosting(company, job);
    if (listing !== null) {
      results.push(listing);
    }
  }
  return results;
}
