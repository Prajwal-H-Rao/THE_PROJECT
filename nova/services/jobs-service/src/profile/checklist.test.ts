/** Tests for the truthful-claim checklist (task 12.11). */

import assert from "node:assert/strict";
import { test } from "node:test";
import { runChecklist, isDraftReady } from "./checklist.js";

/** Build one artifact. */
function artifact(kind: "cover_letter" | "profile_summary" | "response_draft", ready: boolean, unlinked: string[]): { kind: "cover_letter" | "profile_summary" | "response_draft"; ready: boolean; unlinkedClaims: string[]; content: string; claimSources: string[] } {
  return { kind, ready, unlinkedClaims: unlinked, content: "", claimSources: [] };
}

test("all artifacts ready when no unlinked claims", () => {
  const artifacts = {
    coverLetter: artifact("cover_letter", true, []),
    profileSummary: artifact("profile_summary", true, []),
    responseDraft: artifact("response_draft", true, []),
  };

  const result = runChecklist(artifacts);
  assert.equal(result.ready, true);
  assert.equal(result.blockedBy.length, 0);
  assert.equal(isDraftReady(artifacts), true);
});

test("one unlinked claim blocks readiness", () => {
  const artifacts = {
    coverLetter: artifact("cover_letter", false, ["headline"]),
    profileSummary: artifact("profile_summary", true, []),
    responseDraft: artifact("response_draft", true, []),
  };

  const result = runChecklist(artifacts);
  assert.equal(result.ready, false);
  assert.ok(result.blockedBy.includes("cover_letter: unlinked claims block readiness: headline"));
  assert.equal(isDraftReady(artifacts), false);
});

test("multiple unlinked claims all reported", () => {
  const artifacts = {
    coverLetter: artifact("cover_letter", false, ["headline", "summary"]),
    profileSummary: artifact("profile_summary", false, ["location"]),
    responseDraft: artifact("response_draft", true, []),
  };

  const result = runChecklist(artifacts);
  assert.equal(result.ready, false);
  assert.equal(result.blockedBy.length, 2);
});
