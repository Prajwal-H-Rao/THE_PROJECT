/** Tests for the explainable scorer. Every survivor shows its factors and missing tokens. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { SCORE_WEIGHTS, scoreListing } from "./score.js";
import type { RankedCandidate, RankedListing } from "./ranked-types.js";

/** Build one candidate that passes every filter against the base listing. */
function candidate(overrides: Partial<RankedCandidate> = {}): RankedCandidate {
  return {
    candidate_id: "c1",
    skills: ["go", "kubernetes", "sql"],
    years: 5,
    location: "Bengaluru",
    work_auth: ["IN"],
    remote_pref: "hybrid",
    roles: ["backend"],
    salary_min: { IN: 35 },
    ...overrides,
  };
}

/** Build one listing that passes every filter against the base candidate. */
function listing(overrides: Partial<RankedListing> = {}): RankedListing {
  return {
    listing_id: "l1",
    role: "backend",
    skills: ["go", "kubernetes", "docker"],
    years: 4,
    location: "Bengaluru",
    work_mode: "hybrid",
    region: "IN",
    sponsorship: "none_required",
    salary_max: 45,
    freshness: "current",
    ...overrides,
  };
}

test("a survivor shows its full factor breakdown", () => {
  const result = scoreListing(candidate(), listing());
  assert.equal(result.passed, true);
  const names = result.factors.map((factor) => factor.name);
  assert.deepEqual(names, ["skills", "experience", "place", "salary", "freshness"]);
  for (const factor of result.factors) {
    assert.ok(factor.weight > 0);
    assert.ok(factor.raw >= 0 && factor.raw <= 1);
    assert.ok(Math.abs(factor.contribution - factor.raw * factor.weight) < 1e-9);
  }
});

test("the factor weights sum to one and the score is their sum", () => {
  const weights = Object.values(SCORE_WEIGHTS);
  assert.ok(Math.abs(weights.reduce((sum, w) => sum + w, 0) - 1) < 1e-9);
  const result = scoreListing(candidate(), listing());
  assert.ok(Math.abs(result.score - result.factors.reduce((s, f) => s + f.contribution, 0)) < 1e-6);
});

test("the skills factor is the fraction of listing skills the candidate holds", () => {
  const result = scoreListing(candidate(), listing());
  const skills = result.factors.find((factor) => factor.name === "skills");
  assert.equal(skills?.raw, 2 / 3);
});

test("missing requirement tokens surface", () => {
  const result = scoreListing(candidate(), listing());
  assert.deepEqual(result.missing, ["docker"]);
});

test("a filtered listing keeps score zero and shows no factors", () => {
  const result = scoreListing(candidate({ roles: ["qa"] }), listing());
  assert.equal(result.passed, false);
  assert.equal(result.score, 0);
  assert.deepEqual(result.factors, []);
  assert.ok(result.reasons.includes("role:role_family_mismatch:backend"));
});

test("the score is deterministic", () => {
  assert.deepEqual(
    scoreListing(candidate({ years: 1 }), listing({ years: 2 })),
    scoreListing(candidate({ years: 1 }), listing({ years: 2 })),
  );
});
