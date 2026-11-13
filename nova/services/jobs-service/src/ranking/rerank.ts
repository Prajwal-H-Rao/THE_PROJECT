/**
 * The embedding rerank. It reorders hard-filter survivors only, so a similarity
 * score can never waive a hard filter. The similarity function is injectable.
 */

import type { ScoredListing } from "./ranked-types.js";

/**
 * Rerank the scored listings. Survivors reorder by the blended score; filtered
 * listings keep their relative order at the bottom in every case.
 */
export function rerank(
  scored: readonly ScoredListing[],
  similarityOf: (listingId: string) => number,
): ScoredListing[] {
  const survivors = scored.filter((entry) => entry.passed);
  const filtered = scored.filter((entry) => !entry.passed);
  const blended = survivors
    .map((entry) => ({ entry, blend: entry.score * 0.7 + similarityOf(entry.listing_id) * 0.3 }))
    .sort((a, b) => b.blend - a.blend || a.entry.listing_id.localeCompare(b.entry.listing_id))
    .map((pair) => pair.entry);
  return [...blended, ...filtered];
}

/**
 * Build a deterministic offline similarity from skill-token vectors.
 * Real embeddings come from the ml-service through config; this keeps the
 * eval run reproducible with no network and no model.
 */
export function tokenCosine(candidateTokens: readonly string[], listingTokens: readonly string[]): number {
  const candidate = vectorOf(candidateTokens);
  const listing = vectorOf(listingTokens);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [index, value] of candidate.entries()) {
    dot += value * (listing[index] ?? 0);
    normA += value * value;
  }
  for (const value of listing) {
    normB += value * value;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / Math.sqrt(normA * normB);
}

/** Map tokens into a stable 64-dimension unit-scaled vector. The hash fixes the index. */
function vectorOf(tokens: readonly string[]): number[] {
  const vector = new Array<number>(64).fill(0);
  for (const token of tokens) {
    const index = hashOf(token) % 64;
    vector[index] = (vector[index] ?? 0) + 1;
  }
  return vector;
}

/** Return a stable non-cryptographic hash for one token. */
function hashOf(token: string): number {
  let hash = 5381;
  for (const byte of Buffer.from(token, "utf8")) {
    hash = ((hash * 33) + byte) | 0;
  }
  return Math.abs(hash);
}
