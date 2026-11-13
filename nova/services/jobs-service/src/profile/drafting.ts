/**
 * Artifact drafting (task 12.10, spec:528).
 * Drafts cover letters, profile summaries and response drafts from verified
 * profile facts only. Every claim links to a profile source; claims without
 * a source are marked for user input.
 */

import { type ProfileCandidateFields } from "./span-mapping.js";

/** One drafted artifact with source linkage. */
export interface DraftedArtifact {
  readonly kind: "cover_letter" | "profile_summary" | "response_draft";
  readonly content: string;
  readonly claimSources: readonly string[];
  readonly unlinkedClaims: readonly string[];
  readonly ready: boolean;
}

/** Build one cover letter from verified candidate fields. */
function coverLetter(fields: ProfileCandidateFields): DraftedArtifact {
  const sources: string[] = [];
  const unlinked: string[] = [];
  const parts: string[] = [];

  if (fields.headline.value && fields.headline.source_ref) {
    parts.push(`I am writing to apply for the ${fields.headline.value} role.`);
    sources.push(fields.headline.source_ref);
  } else if (fields.headline.value) {
    unlinked.push("headline");
  }

  if (fields.summary.value && fields.summary.source_ref) {
    parts.push(fields.summary.value);
    sources.push(fields.summary.source_ref);
  } else if (fields.summary.value) {
    unlinked.push("summary");
  }

  if (fields.skills.value.length > 0 && fields.skills.source_ref) {
    parts.push(`My skills include ${fields.skills.value.join(", ")}.`);
    sources.push(fields.skills.source_ref);
  } else if (fields.skills.value.length > 0) {
    unlinked.push("skills");
  }

  if (fields.experience.value && fields.experience.source_ref) {
    parts.push(fields.experience.value);
    sources.push(fields.experience.source_ref);
  } else if (fields.experience.value) {
    unlinked.push("experience");
  }

  return {
    kind: "cover_letter",
    content: parts.join("\n\n"),
    claimSources: sources,
    unlinkedClaims: unlinked,
    ready: unlinked.length === 0,
  };
}

/** Build one profile summary from verified candidate fields. */
function profileSummary(fields: ProfileCandidateFields): DraftedArtifact {
  const sources: string[] = [];
  const unlinked: string[] = [];
  const parts: string[] = [];

  if (fields.headline.value && fields.headline.source_ref) {
    parts.push(`${fields.headline.value} with proven experience.`);
    sources.push(fields.headline.source_ref);
  } else if (fields.headline.value) {
    unlinked.push("headline");
  }

  if (fields.location.value && fields.location.source_ref) {
    parts.push(`Based in ${fields.location.value}.`);
    sources.push(fields.location.source_ref);
  } else if (fields.location.value) {
    unlinked.push("location");
  }

  return {
    kind: "profile_summary",
    content: parts.join(" "),
    claimSources: sources,
    unlinkedClaims: unlinked,
    ready: unlinked.length === 0,
  };
}

/** Build one response draft from verified candidate fields. */
function responseDraft(fields: ProfileCandidateFields, question: string): DraftedArtifact {
  const sources: string[] = [];
  const unlinked: string[] = [];

  let content = `Regarding "${question}": `;
  if (fields.experience.value && fields.experience.source_ref) {
    content += fields.experience.value;
    sources.push(fields.experience.source_ref);
  } else {
    content += "I can provide details on request.";
    unlinked.push("experience");
  }

  if (fields.skills.value.length > 0 && fields.skills.source_ref) {
    content += ` My relevant skills include ${fields.skills.value.join(", ")}.`;
    sources.push(fields.skills.source_ref);
  } else if (fields.skills.value.length > 0) {
    unlinked.push("skills");
  }

  return {
    kind: "response_draft",
    content,
    claimSources: sources,
    unlinkedClaims: unlinked,
    ready: unlinked.length === 0,
  };
}

/**
 * Draft all three artifact kinds from candidate fields. Every claim links to
 * a source_ref; unlinked claims are listed separately and block readiness.
 */
export function draftArtifacts(
  fields: ProfileCandidateFields,
  question: string,
): { coverLetter: DraftedArtifact; profileSummary: DraftedArtifact; responseDraft: DraftedArtifact } {
  return {
    coverLetter: coverLetter(fields),
    profileSummary: profileSummary(fields),
    responseDraft: responseDraft(fields, question),
  };
}
