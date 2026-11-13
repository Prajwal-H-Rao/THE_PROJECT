/**
 * Permitted public-page extractor (task 13.13, spec:569-575).
 * Extracts JobPosting structured data (JSON-LD or microdata) from a public
 * employer career page. Gated on a review record: returns unsupported unless
 * a source_evidence_url and review timestamp are present (spec:629, plan task 13).
 * fetch is injected; tests use fixture HTML. Pulls only from the configured URL (spec:577).
 */

import { readJobListing, type JobListing } from "@nova/contracts/job-listing";
import { createHash } from "node:crypto";

function fingerprintOf(sourceJobId: string, canonicalUri: string): string {
  return createHash("sha256").update(`${sourceJobId}|${canonicalUri}`, "utf8").digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Extract JSON-LD JobPosting objects from HTML. */
function extractJsonLdJobPostings(html: string): Array<Record<string, unknown>> {
  const results: Array<Record<string, unknown>> = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const group = match[1];
      if (group === undefined) {
        continue;
      }
      const parsed = JSON.parse(group) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item === "object" && (item as Record<string, unknown>)["@type"] === "JobPosting") {
          results.push(item as Record<string, unknown>);
        }
      }
    } catch {
      // Malformed JSON-LD is skipped.
    }
  }
  return results;
}

/** Map one JobPosting to a JobListing. Returns null when unreadable. */
function mapJobPosting(url: string, posting: Record<string, unknown>): JobListing | null {
  const title = posting["title"];
  const sourceJobId = String(posting["identifier"] ?? posting["id"] ?? "");
  const canonicalUri = String(posting["url"] ?? url);
  const datePosted = posting["datePosted"];
  const validThrough = posting["validThrough"];
  const hiringOrg = posting["hiringOrganization"];
  const employer = typeof hiringOrg === "object" && hiringOrg !== null
    ? String((hiringOrg as Record<string, unknown>)["name"] ?? "")
    : "";
  if (!title || !sourceJobId || !canonicalUri || !employer) {
    return null;
  }
  const listing: JobListing = {
    connector_id: "public_page",
    canonical_uri: canonicalUri,
    employer,
    title: String(title),
    location: undefined,
    work_mode: undefined,
    posted_at: typeof datePosted === "string" ? datePosted : undefined,
    expires_at: typeof validThrough === "string" ? validThrough : undefined,
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

/** Review gate: returns unsupported unless the source has evidence and review. */
function reviewGate(sourceEvidenceUrl: string | null, reviewedAt: string | null): "unsupported" | "ok" {
  if (!sourceEvidenceUrl || !reviewedAt) {
    return "unsupported";
  }
  return "ok";
}

/**
 * Extract listings from one public page. url is the page URL. reviewEvidence
 * carries the source_evidence_url and reviewed_at from the source record.
 * fetch is injected; tests use fixtures.
 */
export async function extractPublicPageListings(
  url: string,
  reviewEvidence: { sourceEvidenceUrl: string | null; reviewedAt: string | null },
  fetch: typeof globalThis.fetch,
): Promise<JobListing[] | { status: "unsupported"; reason: string }> {
  const gate = reviewGate(reviewEvidence.sourceEvidenceUrl, reviewEvidence.reviewedAt);
  if (gate === "unsupported") {
    return { status: "unsupported", reason: "no_review_record" };
  }
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return [];
  }
  if (!response.ok) {
    return [];
  }
  let html: string;
  try {
    html = await response.text();
  } catch {
    return [];
  }
  const postings = extractJsonLdJobPostings(html);
  const results: JobListing[] = [];
  for (const posting of postings) {
    const listing = mapJobPosting(url, posting);
    if (listing !== null) {
      results.push(listing);
    }
  }
  return results;
}
