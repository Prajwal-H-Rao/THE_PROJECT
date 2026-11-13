/**
 * The hard filters. Deterministic code only: no model call, no network, no randomness.
 * A filter failure always names its reason. Reasons surface as missing requirements.
 */

import type { RankedCandidate, RankedListing, FilterOutcome } from "./ranked-types.js";

/** Return the pass/fail of the work-authorisation filter. */
function workAuthFilter(candidate: RankedCandidate, listing: RankedListing): FilterOutcome {
  if (listing.sponsorship === "clearance") {
    return { passed: false, reason: "security_clearance_required" };
  }
  if (listing.sponsorship === "sponsorship" && !candidate.work_auth.includes(listing.region)) {
    return { passed: false, reason: "work_authorisation_missing" };
  }
  return { passed: true, reason: "" };
}

/** Return the pass/fail of the place filter. Onsite and hybrid demand the same city. */
function placeFilter(candidate: RankedCandidate, listing: RankedListing): FilterOutcome {
  if (listing.work_mode === "remote") {
    return { passed: true, reason: "" };
  }
  if (listing.location.toLowerCase() === candidate.location.toLowerCase()) {
    return { passed: true, reason: "" };
  }
  return { passed: false, reason: `city_mismatch:${listing.location}` };
}

/** Return the pass/fail of the experience filter. */
function experienceFilter(candidate: RankedCandidate, listing: RankedListing): FilterOutcome {
  if (listing.years > candidate.years) {
    return { passed: false, reason: `experience_gap:needs_${listing.years}_has_${candidate.years}` };
  }
  return { passed: true, reason: "" };
}

/** Return the pass/fail of the role-family filter. */
function roleFilter(candidate: RankedCandidate, listing: RankedListing): FilterOutcome {
  if (candidate.roles.includes(listing.role)) {
    return { passed: true, reason: "" };
  }
  return { passed: false, reason: `role_family_mismatch:${listing.role}` };
}

/** Return the pass/fail of the salary filter. A missing salary cap never filters. */
function salaryFilter(candidate: RankedCandidate, listing: RankedListing): FilterOutcome {
  const floor = candidate.salary_min[listing.region];
  if (listing.salary_max === null || floor === undefined) {
    return { passed: true, reason: "" };
  }
  if (listing.salary_max < floor) {
    return { passed: false, reason: `salary_below_floor:${listing.salary_max}` };
  }
  return { passed: true, reason: "" };
}

/** Every filter in the fixed evaluation order. Order-stable so reasons stay comparable. */
const FILTERS: ReadonlyArray<{
  readonly name: string;
  readonly run: (c: RankedCandidate, l: RankedListing) => FilterOutcome;
}> = [
  { name: "work_auth", run: workAuthFilter },
  { name: "place", run: placeFilter },
  { name: "experience", run: experienceFilter },
  { name: "role", run: roleFilter },
  { name: "salary", run: salaryFilter },
];

/**
 * Apply every hard filter in order. Returns pass/fail with the reason list.
 * A model call here would be a spec violation, so this module imports nothing else.
 */
export function applyHardFilters(
  candidate: RankedCandidate,
  listing: RankedListing,
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  for (const filter of FILTERS) {
    const outcome = filter.run(candidate, listing);
    if (!outcome.passed) {
      reasons.push(`${filter.name}:${outcome.reason}`);
    }
  }
  return { passed: reasons.length === 0, reasons };
}

/** Return the filter names in their fixed order. Used by tests and the report. */
export function filterNames(): string[] {
  return FILTERS.map((filter) => filter.name);
}
