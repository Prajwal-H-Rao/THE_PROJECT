/**
 * Span mapping (task 12.9, spec:522, spec:523).
 * Maps parser output spans to resume_profile candidate fields. Every candidate
 * field carries a source_ref, extraction method and confidence. A field with
 * no resolvable span is marked unknown.
 */

import { readJobListing, type JobListing } from "@nova/contracts/job-listing";

/** One parser span with character-level provenance. */
export interface SourceSpan {
  readonly text: string;
  readonly page: number;
  readonly paragraph: number;
  readonly charStart: number;
  readonly charEnd: number;
}

/** One candidate field with its provenance. */
export interface CandidateField<T> {
  readonly value: T;
  readonly source_ref: string;
  readonly method: string;
  readonly confidence: number;
}

/** Build a source_ref from one span. Stable and resolvable. */
function spanRef(span: SourceSpan): string {
  return `span:p${span.page}/par${span.paragraph}/c${span.charStart}-${span.charEnd}`;
}

/** Map one span to a text candidate field. */
function mapText(span: SourceSpan, method: string, confidence: number): CandidateField<string> {
  return {
    value: span.text,
    source_ref: spanRef(span),
    method,
    confidence,
  };
}

/** Mark a field as unknown when no span resolves to it. */
function unknownTextField(): CandidateField<string> {
  return { value: "", source_ref: "", method: "unknown", confidence: 0 };
}

/** Mark a string array field as unknown when no span resolves to it. */
function unknownStringArrayField(): CandidateField<string[]> {
  return { value: [], source_ref: "", method: "unknown", confidence: 0 };
}

/** The candidate fields the parser can populate on a resume profile. */
export interface ProfileCandidateFields {
  readonly headline: CandidateField<string>;
  readonly summary: CandidateField<string>;
  readonly skills: CandidateField<string[]>;
  readonly experience: CandidateField<string>;
  readonly education: CandidateField<string>;
  readonly location: CandidateField<string>;
}

/** Map parser spans to candidate fields. Fields with no span stay unknown. */
export function mapCandidateFields(spans: {
  headline?: SourceSpan;
  summary?: SourceSpan;
  skills?: SourceSpan;
  experience?: SourceSpan;
  education?: SourceSpan;
  location?: SourceSpan;
}): ProfileCandidateFields {
  return {
    headline: spans.headline !== undefined ? mapText(spans.headline, "parser", 0.9) : unknownTextField(),
    summary: spans.summary !== undefined ? mapText(spans.summary, "parser", 0.9) : unknownTextField(),
    skills: spans.skills !== undefined
      ? {
          value: spans.skills.text.split(/\s*,\s*/).filter((s) => s.length > 0),
          source_ref: spanRef(spans.skills),
          method: "parser",
          confidence: 0.85,
        }
      : unknownStringArrayField(),
    experience: spans.experience !== undefined ? mapText(spans.experience, "parser", 0.9) : unknownTextField(),
    education: spans.education !== undefined ? mapText(spans.education, "parser", 0.9) : unknownTextField(),
    location: spans.location !== undefined ? mapText(spans.location, "parser", 0.9) : unknownTextField(),
  };
}

/** Validate that a job listing input passes the JobListing contract. */
export function validateJobListing(input: unknown): JobListing | null {
  return readJobListing(input);
}
