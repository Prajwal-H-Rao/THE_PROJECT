/** Tests for the rerank. Similarity reorders survivors only, never waives a filter. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { rerank, tokenCosine } from "./rerank.js";
import type { ScoredListing } from "./ranked-types.js";

/** Build one scored entry. */
function entry(id: string, passed: boolean, score: number): ScoredListing {
  return { listing_id: id, passed, reasons: passed ? [] : ["role:role_family_mismatch:backend"], score, factors: [], missing: [] };
}

test("a perfect similarity on a filtered listing cannot raise it", () => {
  const input = [entry("survivor", true, 0.2), entry("blocked", false, 0)];
  const out = rerank(input, () => 1);
  assert.equal(out[out.length - 1]?.listing_id, "blocked");
  assert.equal(out[out.length - 1]?.passed, false);
});

test("filtered listings keep their relative order at the bottom", () => {
  const input = [entry("blocked-b", false, 0), entry("survivor", true, 0.5), entry("blocked-a", false, 0)];
  const out = rerank(input, () => 1);
  const tail = out.filter((item) => !item.passed).map((item) => item.listing_id);
  assert.deepEqual(tail, ["blocked-b", "blocked-a"]);
});

test("survivors reorder by the blended score", () => {
  const input = [entry("low", true, 0.3), entry("high", true, 0.6)];
  const out = rerank(input, () => 0);
  assert.deepEqual(out.map((item) => item.listing_id), ["high", "low"]);
});

test("similarity can lift a weaker survivor", () => {
  const input = [entry("weak", true, 0.3), entry("strong", true, 0.6)];
  const out = rerank(input, (id) => (id === "weak" ? 1 : 0));
  assert.equal(out[0]?.listing_id, "weak");
});

test("ties break by listing id", () => {
  const input = [entry("b", true, 0.5), entry("a", true, 0.5)];
  const out = rerank(input, () => 0.5);
  assert.deepEqual(out.map((item) => item.listing_id), ["a", "b"]);
});

test("token cosine is deterministic and bounded", () => {
  const a = tokenCosine(["go", "kubernetes"], ["go", "kubernetes"]);
  const b = tokenCosine(["go", "kubernetes"], ["go", "kubernetes"]);
  assert.equal(a, b);
  assert.ok(a > 0.9 && a <= 1);
  assert.equal(tokenCosine([], ["go"]), 0);
  assert.ok(tokenCosine(["go"], ["react"]) >= 0 && tokenCosine(["go"], ["react"]) < 1);
});
