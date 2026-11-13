/**
 * Canonical ID normalisation and duplicate detection (task 13.18).
 * Normalises employer and job identifiers so the same entity from different
 * sources resolves to one canonical key. Exact matching on canonical ID;
 * fuzzy matching on name similarity for near-duplicates.
 */

import { createHash } from "node:crypto";

/** Canonical key for one employer. */
export interface CanonicalEmployerId {
  readonly employerId: string;
  readonly canonicalName: string;
  readonly normalizedName: string;
}

/** Canonical key for one job opening. */
export interface CanonicalJobId {
  readonly jobId: string;
  readonly employerId: string;
  readonly canonicalTitle: string;
}

/** One duplicate pair with confidence. */
export interface DuplicatePair {
  readonly idA: string;
  readonly idB: string;
  readonly confidence: number; // 0.0 to 1.0
  readonly method: "exact" | "fuzzy";
}

/** Normalise whitespace and case for comparison. */
function normaliseText(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

/** SHA-256 hash of one string. */
function hashOf(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Build a canonical employer ID from raw employer data.
 * The canonical ID is stable across sources for the same employer.
 */
export function canonicalEmployerId(
  name: string,
  region: string,
): CanonicalEmployerId {
  const canonicalName = normaliseText(name);
  const normalizedName = hashOf(`${region}|${canonicalName}`).slice(0, 16);
  return {
    employerId: normalizedName,
    canonicalName,
    normalizedName,
  };
}

/**
 * Build a canonical job ID from employer ID and job title.
 */
export function canonicalJobId(
  employerId: string,
  title: string,
): CanonicalJobId {
  const canonicalTitle = normaliseText(title);
  const jobId = hashOf(`${employerId}|${canonicalTitle}`).slice(0, 16);
  return {
    jobId,
    employerId,
    canonicalTitle,
  };
}

/** Exact duplicate detection: same canonical ID means same entity. */
export function findExactDuplicates<A extends { id: string }>(
  items: A[],
): DuplicatePair[] {
  const seen = new Map<string, string>();
  const duplicates: DuplicatePair[] = [];
  for (const item of items) {
    const existing = seen.get(item.id);
    if (existing !== undefined) {
      duplicates.push({
        idA: existing,
        idB: item.id,
        confidence: 1.0,
        method: "exact",
      });
    } else {
      seen.set(item.id, item.id);
    }
  }
  return duplicates;
}

/**
 * Fuzzy duplicate detection: Jaro-Winkler-style similarity on canonical names.
 * Returns pairs above the confidence threshold.
 */
export function findFuzzyDuplicates(
  items: Array<{ id: string; name: string }>,
  threshold: number = 0.85,
): DuplicatePair[] {
  const duplicates: DuplicatePair[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const itemA = items[i]!;
      const itemB = items[j]!;
      const conf = nameSimilarity(itemA.name, itemB.name);
      if (conf >= threshold) {
        duplicates.push({
          idA: itemA.id,
          idB: itemB.id,
          confidence: conf,
          method: "fuzzy",
        });
      }
    }
  }
  return duplicates;
}

/** Character-level similarity: intersection over union of character bigrams. */
function nameSimilarity(a: string, b: string): number {
  const bigramsA = bigrams(normaliseText(a));
  const bigramsB = bigrams(normaliseText(b));
  if (bigramsA.size === 0 && bigramsB.size === 0) return 1.0;
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0.0;
  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection += 1;
  }
  const union = bigramsA.size + bigramsB.size - intersection;
  return intersection / union;
}

/** Bigram set of one string. */
function bigrams(text: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < text.length - 1; i++) {
    set.add(text.slice(i, i + 2));
  }
  return set;
}
