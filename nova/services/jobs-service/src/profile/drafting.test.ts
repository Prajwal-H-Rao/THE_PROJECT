/** Tests for the artifact drafting module (task 12.10). */

import assert from "node:assert/strict";
import { test } from "node:test";
import { draftArtifacts, type DraftedArtifact } from "./drafting.js";
import { type ProfileCandidateFields } from "./span-mapping.js";

/** Build one candidate field. */
function field(value: string, source: string): { value: string; source_ref: string; method: string; confidence: number } {
  return { value, source_ref: source, method: "parser", confidence: 0.9 };
}

/** Build one string-array candidate field. */
function arrField(value: string[], source: string): { value: string[]; source_ref: string; method: string; confidence: number } {
  return { value, source_ref: source, method: "parser", confidence: 0.85 };
}

test("all artifacts ready when all fields have sources", () => {
  const fields: ProfileCandidateFields = {
    headline: field("Backend Engineer", "span:p1/par1/c0-17"),
    summary: field("Experienced engineer", "span:p1/par2/c0-18"),
    skills: arrField(["Go", "Kubernetes"], "span:p1/par3/c0-21"),
    experience: field("5 years", "span:p1/par4/c0-6"),
    education: field("BS CS", "span:p1/par5/c0-17"),
    location: field("Bengaluru", "span:p1/par6/c0-9"),
  };

  const artifacts = draftArtifacts(fields, "Why do you want this role?");
  assert.equal(artifacts.coverLetter.ready, true);
  assert.equal(artifacts.profileSummary.ready, true);
  assert.equal(artifacts.responseDraft.ready, true);
  assert.equal(artifacts.coverLetter.unlinkedClaims.length, 0);
  assert.equal(artifacts.profileSummary.unlinkedClaims.length, 0);
  assert.equal(artifacts.responseDraft.unlinkedClaims.length, 0);
});

test("unlinked claims block readiness", () => {
  const fields: ProfileCandidateFields = {
    headline: field("Backend Engineer", ""),
    summary: { value: "", source_ref: "", method: "unknown", confidence: 0 },
    skills: arrField([], ""),
    experience: { value: "", source_ref: "", method: "unknown", confidence: 0 },
    education: { value: "", source_ref: "", method: "unknown", confidence: 0 },
    location: { value: "", source_ref: "", method: "unknown", confidence: 0 },
  };

  const artifacts = draftArtifacts(fields, "Why do you want this role?");
  assert.equal(artifacts.coverLetter.ready, false);
  assert.ok(artifacts.coverLetter.unlinkedClaims.includes("headline"));
});

test("cover letter includes verified fields", () => {
  const fields: ProfileCandidateFields = {
    headline: field("Backend Engineer", "span:p1/par1/c0-17"),
    summary: { value: "", source_ref: "", method: "unknown", confidence: 0 },
    skills: arrField([], ""),
    experience: { value: "", source_ref: "", method: "unknown", confidence: 0 },
    education: { value: "", source_ref: "", method: "unknown", confidence: 0 },
    location: { value: "", source_ref: "", method: "unknown", confidence: 0 },
  };

  const artifacts = draftArtifacts(fields, "Why do you want this role?");
  assert.ok(artifacts.coverLetter.content.includes("Backend Engineer"));
  assert.ok(artifacts.coverLetter.claimSources.includes("span:p1/par1/c0-17"));
});
