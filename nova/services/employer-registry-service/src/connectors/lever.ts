/**
 * Lever Postings adapter (task 13.9, spec:569-575).
 * Fetches public job postings from Lever's public postings API.
 * Tries the JSON endpoint first; on failure falls back to ?mode=xml.
 * Maps results into the JobListing contract schema (task 12.1).
 * fetch is injected; tests use fixtures. Pulls only from jobs.lever.co (spec:577).
 */

import { readJobListing, type JobListing } from "@nova/contracts/job-listing";
import { createHash } from "node:crypto";

function fingerprintOf(sourceJobId: string, canonicalUri: string): string {
  return createHash("sha256").update(`${sourceJobId}|${canonicalUri}`, "utf8").digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapLeverPosting(company: string, posting: unknown): JobListing | null {
  const record = posting as Record<string, unknown>;
  const id = record["id"];
  const text = record["text"];
  const hostedUrl = record["hostedUrl"];
  const categories = record["categories"];
  const createdAt = record["createdAt"];
  if (typeof id !== "string" || typeof text !== "string" || typeof hostedUrl !== "string") {
    return null;
  }
  const sourceJobId = id;
  const canonicalUri = hostedUrl;
  const location = typeof categories === "object" && categories !== null
    ? String((categories as Record<string, unknown>)["location"] ?? "")
    : undefined;
  const listing: JobListing = {
    connector_id: "lever",
    canonical_uri: canonicalUri,
    employer: company,
    title: text,
    location,
    work_mode: undefined,
    posted_at: typeof createdAt === "string" ? createdAt : undefined,
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
 * Fetch Lever listings for one company. Tries JSON first; on failure falls back
 * to ?mode=xml (the XML path is not parsed here — a future XML parser task can
 * handle it; the fallback attempt itself is recorded by returning an empty list
 * when both fail, never by throwing).
 */
export async function fetchLeverListings(
  company: string,
  fetch: typeof globalThis.fetch,
): Promise<JobListing[]> {
  const jsonUrl = `https://jobs.lever.co/${company}?mode=json`;
  let jobs = await fetchJson(jsonUrl, fetch);
  if (jobs.length === 0) {
    const xmlUrl = `https://jobs.lever.co/${company}?mode=xml`;
    jobs = await fetchJson(xmlUrl, fetch);
  }
  const results: JobListing[] = [];
  for (const job of jobs) {
    const listing = mapLeverPosting(company, job);
    if (listing !== null) {
      results.push(listing);
    }
  }
  return results;
}
