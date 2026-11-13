/**
 * Nova design system - Employer Registry service.
 * EmployerAlias entity: one row of the reviewed alias table (spec:1546).
 * A NULL targetEmployerId marks an unresolved subsidiary awaiting review.
 */

// One alias relationship row in employer_registry_service.employer_aliases.
interface EmployerAlias {
  aliasId: string;
  sourceEmployerId: string;
  targetEmployerId: string | null;
  aliasName: string;
  normalizedAlias: string;
  aliasType: string;
  confidence: number | null;
  reviewed: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export type { EmployerAlias };
