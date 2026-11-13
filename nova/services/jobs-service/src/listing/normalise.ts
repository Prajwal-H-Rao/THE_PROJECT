/**
 * The listing normaliser. It turns raw source fields into canonical fields.
 * Every normalised field carries its source and the listing freshness.
 */

/**
 * The listing normaliser. It turns raw source fields into canonical fields.
 * Every normalised field carries its source and the listing freshness.
 * Types and provenance helpers live in normalise-types.ts.
 */

import { readJobListing, type JobListing } from "@nova/contracts/job-listing";
import {
  freshnessOf,
  toSource,
  type FieldSource,
  type NormalisedField,
  type RawField,
  type RawListing,
  type SourceProvenance,
} from "./normalise-types.js";

/** The role families the ranker knows. */
const ROLE_FAMILIES: ReadonlyArray<string> = [
  "backend", "frontend", "data", "ml", "devops", "qa", "mobile", "security",
];

/** Title keywords mapped to a role family. First match wins. */
const ROLE_HINTS: ReadonlyArray<readonly [string, string]> = [
  ["frontend", "frontend"], ["react", "frontend"], ["ios", "mobile"], ["android", "mobile"],
  ["mobile", "mobile"], ["data eng", "data"], ["ml ", "ml"], ["machine learning", "ml"],
  ["data scien", "ml"], ["security", "security"], ["qa", "qa"], ["test eng", "qa"],
  ["devops", "devops"], ["sre", "devops"], ["backend", "backend"], ["platform", "backend"],
];

/** The field names the normaliser accepts. An unknown name is a programming error. */
const KNOWN_FIELD_NAMES: ReadonlySet<string> = new Set([
  "title", "location", "work_mode", "salary_max", "employment_type",
]);

/** Return the role family for a title. Unknown titles map to "backend". */
function roleFamilyOf(title: string): string {
  const lower = title.toLowerCase();
  for (const [hint, family] of ROLE_HINTS) {
    if (lower.includes(hint)) {
      return family;
    }
  }
  return "backend";
}

/** Tokenise free text into lowercase skill tokens. Deterministic and order-stable. */
function skillTokens(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.replace(/^[+#.]+|[+#.]+$/g, ""))
    .filter((token) => token.length > 1 && token.length < 20);
  return [...new Set(tokens)];
}

/** Extract the highest stated year count from free text. Zero when unstated. */
function experienceYears(text: string): number {
  let best = 0;
  for (const match of text.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi)) {
    const value = Number(match[1]);
    if (value > best) {
      best = value;
    }
  }
  return best;
}

/** Classify the sponsorship demand of free text. A stated negation wins. Deterministic order. */
function sponsorshipOf(text: string): "none_required" | "sponsorship" | "clearance" {
  const lower = text.toLowerCase();
  if (/clearance\s+(?:is\s+)?not\s+required|no\s+(?:security\s+)?clearance/.test(lower)) {
    // Negated clearance is not a demand; fall through to the other keywords.
  } else if (lower.includes("clearance")) {
    return "clearance";
  }
  if (lower.includes("sponsorship") || lower.includes("work authorisation") || lower.includes("work authorization")) {
    return "sponsorship";
  }
  return "none_required";
}

/**
 * Normalise one raw listing. The optional sourced fields keep their raw provenance.
 * Fields derived from the requirements text carry a derived method and a lower confidence.
 */
export function normaliseListing(raw: RawListing, provenance: SourceProvenance): {
  listing: JobListing;
  title: NormalisedField<string>;
  location: NormalisedField<string> | null;
  work_mode: NormalisedField<"remote" | "hybrid" | "onsite"> | null;
  salary_max: NormalisedField<number> | null;
  role_family: NormalisedField<string>;
  experience_years: NormalisedField<number>;
  sponsorship: NormalisedField<"none_required" | "sponsorship" | "clearance">;
  skills: NormalisedField<string[]>;
} {
  for (const name of Object.keys(raw.fields)) {
    if (!KNOWN_FIELD_NAMES.has(name)) {
      throw new Error(`unknown field name: ${name}`);
    }
  }
  const freshness = freshnessOf(provenance);
  const titleField = raw.fields["title"];
  const title = titleField?.value ?? "";
  const requirementText = raw.requirements_text ?? "";
  const derivedSource: FieldSource = {
    source_ref: "requirements_text",
    method: "derived",
    confidence: 0.7,
  };

  const listing = readJobListing({
    connector_id: raw.connector_id,
    canonical_uri: raw.canonical_uri,
    employer: raw.employer,
    ...(raw.employer_id !== undefined ? { employer_id: raw.employer_id } : {}),
    title,
    ...(raw.fields["location"] !== undefined ? { location: raw.fields["location"]!.value } : {}),
    ...(raw.fields["work_mode"] !== undefined
      ? { work_mode: raw.fields["work_mode"]!.value as "remote" | "hybrid" | "onsite" }
      : {}),
    ...(raw.fields["posted_at"] !== undefined ? { posted_at: raw.fields["posted_at"]!.value } : {}),
    ...(raw.fields["expires_at"] !== undefined ? { expires_at: raw.fields["expires_at"]!.value } : {}),
    fingerprint: provenance.fingerprint,
    last_verified_at: provenance.last_verified_at,
    terms_classification: "unreviewed",
    source_job_id: provenance.source_job_id,
    retrieved_at: provenance.retrieved_at,
    freshness_state: provenance.freshness_state,
    listing_status: provenance.listing_status,
  });
  if (listing === null) {
    throw new Error("normalised listing fails the contract");
  }

  const workModeField = raw.fields["work_mode"];
  const salaryField = raw.fields["salary_max"];
  return {
    listing,
    title: { value: title, source: toSource(titleField), freshness },
    location: raw.fields["location"]
      ? { value: raw.fields["location"]!.value, source: toSource(raw.fields["location"]), freshness }
      : null,
    work_mode: workModeField
      ? { value: workModeField.value as "remote" | "hybrid" | "onsite", source: toSource(workModeField), freshness }
      : null,
    salary_max: salaryField
      ? { value: Number(salaryField.value), source: toSource(salaryField), freshness }
      : null,
    role_family: { value: roleFamilyOf(title), source: derivedSource, freshness },
    experience_years: { value: experienceYears(requirementText), source: derivedSource, freshness },
    sponsorship: { value: sponsorshipOf(requirementText), source: derivedSource, freshness },
    skills: { value: skillTokens(requirementText), source: derivedSource, freshness },
  };
}
