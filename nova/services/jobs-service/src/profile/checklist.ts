/**
 * Truthful-claim checklist (task 12.11, spec:527).
 * A draft cannot reach "ready" when it carries an unlinked claim — a claim
 * with no profile source. This enforces that every material fact is
 * source-linked or marked unknown.
 */

import { type DraftedArtifact } from "./drafting.js";

/** The checklist result for one artifact. */
export interface ChecklistResult {
  readonly ready: boolean;
  readonly blockedBy: readonly string[];
  readonly reason: string;
}

/** Check one artifact: ready only when it has no unlinked claims. */
function checkArtifact(artifact: DraftedArtifact): ChecklistResult {
  if (artifact.unlinkedClaims.length === 0) {
    return { ready: true, blockedBy: [], reason: "all claims linked to sources" };
  }
  return {
    ready: false,
    blockedBy: [...artifact.unlinkedClaims],
    reason: `unlinked claims block readiness: ${artifact.unlinkedClaims.join(", ")}`,
  };
}

/** Run the truthful-claim checklist across all artifact kinds. */
export function runChecklist(
  artifacts: { coverLetter: DraftedArtifact; profileSummary: DraftedArtifact; responseDraft: DraftedArtifact },
): ChecklistResult {
  const blocked: string[] = [];
  for (const [, artifact] of Object.entries(artifacts) as [string, DraftedArtifact][]) {
    const result = checkArtifact(artifact);
    if (!result.ready) {
      blocked.push(`${artifact.kind}: ${result.reason}`);
    }
  }
  if (blocked.length === 0) {
    return { ready: true, blockedBy: [], reason: "all claims linked to sources" };
  }
  return { ready: false, blockedBy: blocked, reason: "unlinked claims block readiness" };
}

/** Return true when a draft can reach "ready" (no unlinked claims). */
export function isDraftReady(artifacts: {
  coverLetter: DraftedArtifact;
  profileSummary: DraftedArtifact;
  responseDraft: DraftedArtifact;
}): boolean {
  return runChecklist(artifacts).ready;
}
