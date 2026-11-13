/**
 * SmartRecruiters posting adapter (task 13.11, spec:569-575).
 * Fetches public job postings from SmartRecruiters' public Posting API.
 * Tier-tolerant: when the employer's tier is missing or unsupported, returns
 * {status: "unsupported"} instead of throwing (spec:588 tier tolerance).
 * Maps results into the JobListing contract schema (task 12.1).
 * fetch is injected; tests use fixtures. Pulls only from careers.smartrecruiters.com (spec:577).
 */

import { readJobListing, type JobListing } from "@nova/contracts/job-listing";
import { createHash } from "node:crypto";

/** Returned when the employer's SmartRecruiters tier does not expose public postings. */
export interface UnsupportedResult {
  readonly status: "unsupported";
  readonly company: string;
}

function fingerprintOf(sourceJobId: string, canonicalUri: string): string {
  return createHash("sha256").update(`${sourceJobId}|${canonicalUri}`, "utf8").digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapSmartRecruitersPosting(company: string, posting: unknown): JobListing | null {
  const record = posting as Record<string, unknown>;
  const id = record["id"];
  const name = record["name"];
  const ref = record["ref"];
  const location = record["location"];
  const publishedAt = record["publishedAt"];
  if (typeof id !== "string" || typeof name !== "string" || typeof ref !== "string") {
    return null;
  }
  const sourceJobId = id;
  const canonicalUri = ref;
  const listing: JobListing = {
    connector_id: "smartrecruiters",
    canonical_uri: canonicalUri,
    employer: company,
    title: name,
    location: typeof location === "object" && location !== null
      ? String((location as Record<string, unknown>)["city"] ?? "")
      : undefined,
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

async function fetchJson(url: string, fetch: typeof globalThis.fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return null;
  }
  if (!response.ok) {
    return null;
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return null;
  }
  return body;
}

/**
 * Fetch SmartRecruiters listings for one company. Tier-tolerant: when the
 * response indicates the tier is unsupported, returns {status: "unsupported"}
 * instead of throwing.
 */
export async function fetchSmartRecruitersListings(
  company: string,
  fetch: typeof globalThis.fetch,
): Promise<JobListing[] | UnsupportedResult> {
  const url = `https://careers.smartrecruiters.com/api/v1/company/${company}/postings`;
  const body = await fetchJson(url, fetch);
  if (body === null) {
    return [];
  }
  const record = body as Record<string, unknown>;
  if (record["tier"] === "unsupported" || record["tier"] === undefined) {
    return { status: "unsupported", company };
  }
  const postings = Array.isArray(record["content"]) ? record["content"] : [];
  const results: JobListing[] = [];
  for (const posting of postings) {
    const listing = mapSmartRecruitersPosting(company, posting);
    if (listing !== null) {
      results.push(listing);
    }
  }
  return results;
}
