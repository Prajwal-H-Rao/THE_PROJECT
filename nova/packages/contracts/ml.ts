/** ML service contracts - Pydantic-compatible TypeScript types for ML service API. */

export interface EmbeddingRequest {
  readonly texts: readonly string[];
  readonly model?: string;
  readonly normalize?: boolean;
}

export interface EmbeddingResponse {
  readonly embeddings: readonly (readonly number[])[];
  readonly model: string;
  readonly dimensions: number;
}

export interface ClassificationRequest {
  readonly text: string;
  readonly model?: string;
  readonly labels?: readonly string[];
}

export interface ClassificationResult {
  readonly label: string;
  readonly score: number;
}

export interface ClassificationResponse {
  readonly classifications: readonly ClassificationResult[];
  readonly model: string;
}

export interface SkillExtractionRequest {
  readonly text: string;
  readonly model?: string;
}

export interface ExtractedSkill {
  readonly skill: string;
  readonly category: string | null;
  readonly confidence: number;
  readonly source_span?: {
    readonly char_start: number;
    readonly char_end: number;
  };
}

export interface SkillExtractionResponse {
  readonly skills: readonly ExtractedSkill[];
  readonly model: string;
}