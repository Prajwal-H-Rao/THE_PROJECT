/**
 * The explainable feature scorer. Every result shows its factor breakdown and
 * the requirement tokens the listing asks for that the candidate lacks.
 */

import type { Factor, RankedCandidate, RankedListing, ScoredListing } from "./ranked-types.js";
import { applyHardFilters } from "./hard-filters.js";

/** The factor weights. They sum to one so the score stays a 0..1 value. */
export const SCORE_WEIGHTS = {
  skills: 0.4,
  experience: 0.15,
  place: 0.15,
  salary: 0.15,
  freshness: 0.15,
} as const;

/** Return the skill-overlap factor: how much of the listing stack the candidate holds. */
function skillsFactor(candidate: RankedCandidate, listing: RankedListing): number {
  if (listing.skills.length === 0) {
    return 1;
  }
  const held = new Set(candidate.skills.map((skill) => skill.toLowerCase()));
  const hit = listing.skills.filter((skill) => held.has(skill.toLowerCase())).length;
  return hit / listing.skills.length;
}

/** Return the experience-fit factor: the ratio, capped at one. */
function experienceFactor(candidate: RankedCandidate, listing: RankedListing): number {
  if (listing.years === 0) {
    return 1;
  }
  return Math.min(1, candidate.years / listing.years);
}

/** Return the place-fit factor from the remote preference. */
function placeFactor(candidate: RankedCandidate, listing: RankedListing): number {
  if (candidate.remote_pref === listing.work_mode) {
    return 1;
  }
  if (listing.work_mode === "remote" && candidate.remote_pref !== "none") {
    return 0.7;
  }
  return 0.3;
}

/** Return the salary-headroom factor. Missing values sit at neutral 0.5. */
function salaryFactor(candidate: RankedCandidate, listing: RankedListing): number {
  const floor = candidate.salary_min[listing.region];
  if (listing.salary_max === null || floor === undefined || listing.salary_max <= 0) {
    return 0.5;
  }
  return Math.max(0, Math.min(1, (listing.salary_max - floor) / listing.salary_max));
}

/** Return the freshness factor. */
function freshnessFactor(listing: RankedListing): number {
  return listing.freshness === "current" ? 1 : 0.5;
}

/** Return the listing skill tokens the candidate does not hold. */
function missingSkills(candidate: RankedCandidate, listing: RankedListing): string[] {
  const held = new Set(candidate.skills.map((skill) => skill.toLowerCase()));
  return listing.skills.filter((skill) => !held.has(skill.toLowerCase()));
}

/**
 * Score one candidate-listing pair. Hard filters run first and gate the score.
 * A filtered listing keeps score zero and carries its reasons; no factor runs.
 */
export function scoreListing(candidate: RankedCandidate, listing: RankedListing): ScoredListing {
  const filters = applyHardFilters(candidate, listing);
  if (!filters.passed) {
    return {
      listing_id: listing.listing_id,
      passed: false,
      reasons: filters.reasons,
      score: 0,
      factors: [],
      missing: [],
    };
  }
  const raws = [
    skillsFactor(candidate, listing),
    experienceFactor(candidate, listing),
    placeFactor(candidate, listing),
    salaryFactor(candidate, listing),
    freshnessFactor(listing),
  ];
  const names = ["skills", "experience", "place", "salary", "freshness"] as const;
  const weights = [SCORE_WEIGHTS.skills, SCORE_WEIGHTS.experience, SCORE_WEIGHTS.place, SCORE_WEIGHTS.salary, SCORE_WEIGHTS.freshness];
  const factors: Factor[] = raws.map((raw, index) => ({
    name: names[index]!,
    weight: weights[index]!,
    raw,
    contribution: raw * weights[index]!,
  }));
  const score = factors.reduce((sum, factor) => sum + factor.contribution, 0);
  return {
    listing_id: listing.listing_id,
    passed: true,
    reasons: [],
    score: Math.round(score * 10000) / 10000,
    factors,
    missing: missingSkills(candidate, listing),
  };
}
