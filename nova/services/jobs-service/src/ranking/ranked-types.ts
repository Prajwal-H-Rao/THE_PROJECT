/**
 * The ranker input types. These are the jobs-domain superset of the 12.1 listing contract.
 * The contract carries lifecycle provenance; these types carry the content the ranker needs.
 */

/** The candidate side of one ranking decision. Sourced from the profile or the eval set. */
export interface RankedCandidate {
  readonly candidate_id: string;
  readonly skills: readonly string[];
  readonly years: number;
  readonly location: string;
  readonly work_auth: readonly string[];
  readonly remote_pref: "onsite" | "hybrid" | "remote" | "none";
  readonly roles: readonly string[];
  /** Salary floor per region. IN rows use LPA, GLOBAL rows use USD thousands. */
  readonly salary_min: Readonly<Partial<Record<"IN" | "GLOBAL", number>>>;
}

/** The listing side of one ranking decision. Projected from a normalised listing. */
export interface RankedListing {
  readonly listing_id: string;
  readonly role: string;
  readonly skills: readonly string[];
  readonly years: number;
  readonly location: string;
  readonly work_mode: "remote" | "hybrid" | "onsite";
  readonly region: "IN" | "GLOBAL";
  readonly sponsorship: "none_required" | "sponsorship" | "clearance";
  readonly salary_max: number | null;
  readonly freshness: "current" | "stale";
}

/** One hard-filter outcome. A failure always names its reason. */
export interface FilterOutcome {
  readonly passed: boolean;
  readonly reason: string;
}

/** One scoring factor with its contribution. */
export interface Factor {
  readonly name: string;
  readonly weight: number;
  readonly raw: number;
  readonly contribution: number;
}

/** One ranked result with the full explanation. */
export interface ScoredListing {
  readonly listing_id: string;
  readonly passed: boolean;
  readonly reasons: readonly string[];
  readonly score: number;
  readonly factors: readonly Factor[];
  readonly missing: readonly string[];
}

/** Build one RankedListing from the parts a normalised listing and the source carry. */
export function toRankedListing(parts: {
  listing_id: string;
  role: string;
  skills: readonly string[];
  years: number;
  location: string;
  work_mode: "remote" | "hybrid" | "onsite";
  region: "IN" | "GLOBAL";
  sponsorship: "none_required" | "sponsorship" | "clearance";
  salary_max: number | null;
  freshness: "current" | "stale";
}): RankedListing {
  return { ...parts };
}
