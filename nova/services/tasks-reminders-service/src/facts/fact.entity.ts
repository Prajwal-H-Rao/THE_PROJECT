/**
 * Nova design system - Remembered fact entity.
 * Defines RememberedFact, CreateFactInput, UpdateFactInput, FactListFilter interfaces.
 * Represents one user-owned remembered fact.
 */

export interface RememberedFact {
  readonly factId: string;
  readonly userId: string;
  readonly factText: string;
  readonly sourceType: string | null;
  readonly sourceRef: string | null;
  readonly embedding: number[] | null;
  readonly isArchived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateFactInput {
  readonly factText: string;
  readonly sourceType?: string;
  readonly sourceRef?: string;
}

export interface UpdateFactInput {
  readonly factText?: string;
  readonly sourceType?: string | null;
  readonly sourceRef?: string | null;
  readonly isArchived?: boolean;
}

export interface FactListFilter {
  sourceType?: string[];
  isArchived?: boolean;
}

export interface FactSearchResult {
  readonly factId: string;
  readonly factText: string;
  readonly score: number;
}
