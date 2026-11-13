/**
 * The listing normaliser types. Raw shapes, provenance wrappers and the small
 * helpers the normaliser reuses. Kept apart so the transform stays under 200 lines.
 */

/** One raw field as the source delivered it, with its own provenance. */
export interface RawField {
  readonly value: string;
  readonly source_ref: string;
  readonly method: string;
  readonly confidence: number;
}

/** The listing-level provenance every field inherits. */
export interface SourceProvenance {
  readonly source_job_id: string;
  readonly retrieved_at: string;
  readonly last_verified_at: string;
  readonly fingerprint: string;
  readonly freshness_state: "current" | "stale";
  readonly listing_status: "open" | "closed" | "unknown";
}

/** The raw listing before normalisation. Core identity is separate from sourced fields. */
export interface RawListing {
  readonly connector_id: string;
  readonly canonical_uri: string;
  readonly employer: string;
  readonly employer_id?: string;
  readonly fields: Readonly<Record<string, RawField>>;
  readonly requirements_text?: string;
}

/** The source of one normalised value. */
export interface FieldSource {
  readonly source_ref: string;
  readonly method: string;
  readonly confidence: number;
}

/** The freshness of one normalised value. */
export interface FieldFreshness {
  readonly retrieved_at: string;
  readonly last_verified_at: string;
  readonly state: "current" | "stale";
}

/** One normalised value with its provenance. */
export interface NormalisedField<T> {
  readonly value: T;
  readonly source: FieldSource;
  readonly freshness: FieldFreshness;
}

/** Build the freshness every field inherits. */
export function freshnessOf(provenance: SourceProvenance): FieldFreshness {
  return {
    retrieved_at: provenance.retrieved_at,
    last_verified_at: provenance.last_verified_at,
    state: provenance.freshness_state,
  };
}

/** Wrap one raw field as a source. A missing field becomes a derived unknown source. */
export function toSource(field: RawField | undefined): FieldSource {
  if (field === undefined) {
    return { source_ref: "missing", method: "unknown", confidence: 0 };
  }
  return { source_ref: field.source_ref, method: field.method, confidence: field.confidence };
}
