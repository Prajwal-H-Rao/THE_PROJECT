/** Tests for the hard filters. Deterministic outcomes, named reasons, and no model call. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { applyHardFilters, filterNames } from "./hard-filters.js";
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
    salary_min: { IN: 35, GLOBAL: 140 },
    ...overrides,
  };
}

/** Build one listing that passes every filter against the base candidate. */
function listing(overrides: Partial<RankedListing> = {}): RankedListing {
  return {
    listing_id: "l1",
    role: "backend",
    skills: ["go", "kubernetes"],
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

test("a matching pair passes with no reasons", () => {
  const result = applyHardFilters(candidate(), listing());
  assert.equal(result.passed, true);
  assert.deepEqual(result.reasons, []);
});

test("clearance demand always fails the work-auth filter", () => {
  const result = applyHardFilters(candidate(), listing({ sponsorship: "clearance" }));
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes("work_auth:security_clearance_required"));
});

test("sponsorship without the region authorisation fails", () => {
  const result = applyHardFilters(candidate({ work_auth: ["EU"] }), listing({ sponsorship: "sponsorship" }));
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes("work_auth:work_authorisation_missing"));
});

test("sponsorship with the region authorisation passes", () => {
  const result = applyHardFilters(candidate(), listing({ sponsorship: "sponsorship" }));
  assert.equal(result.passed, true);
});

test("a city mismatch fails for onsite and hybrid", () => {
  for (const mode of ["onsite", "hybrid"] as const) {
    const result = applyHardFilters(candidate(), listing({ work_mode: mode, location: "Pune" }));
    assert.equal(result.passed, false);
    assert.ok(result.reasons.some((r) => r.startsWith("place:city_mismatch")));
  }
});

test("a remote listing ignores the city", () => {
  const result = applyHardFilters(candidate(), listing({ work_mode: "remote", location: "Pune" }));
  assert.equal(result.passed, true);
});

test("an experience gap fails with the counts named", () => {
  const result = applyHardFilters(candidate({ years: 2 }), listing({ years: 4 }));
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes("experience:experience_gap:needs_4_has_2"));
});

test("a role-family mismatch fails", () => {
  const result = applyHardFilters(candidate({ roles: ["frontend"] }), listing());
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes("role:role_family_mismatch:backend"));
});

test("a salary cap below the floor fails", () => {
  const result = applyHardFilters(candidate(), listing({ salary_max: 30 }));
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes("salary:salary_below_floor:30"));
});

test("a missing salary cap or missing floor never filters", () => {
  assert.equal(applyHardFilters(candidate(), listing({ salary_max: null })).passed, true);
  assert.equal(applyHardFilters(candidate({ salary_min: {} }), listing()).passed, true);
});

test("every reason carries its filter prefix", () => {
  const result = applyHardFilters(candidate({ years: 1, roles: ["qa"] }), listing({ sponsorship: "clearance" }));
  for (const reason of result.reasons) {
    assert.ok(filterNames().some((name) => reason.startsWith(`${name}:`)));
  }
});

test("the filters are deterministic: the same input gives the same output", () => {
  const a = applyHardFilters(candidate({ years: 1 }), listing({ years: 3 }));
  const b = applyHardFilters(candidate({ years: 1 }), listing({ years: 3 }));
  assert.deepEqual(a, b);
});

test("the filter module never calls a model", () => {
  // The proof is structural: the compiled module text holds no model, network or fetch symbol.
  const path = fileURLToPath(new URL("./hard-filters.js", import.meta.url));
  const text = readFileSync(path, "utf8");
  for (const banned of ["ml-client", "fetch(", "http", "XMLHttpRequest", "model-gateway"]) {
    assert.ok(!text.includes(banned), `banned symbol found: ${banned}`);
  }
});
