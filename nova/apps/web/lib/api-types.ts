/**
 * Nova design system - API types for tasks and notes.
 * Shared TypeScript interfaces for backend API responses.
 */

export interface Task {
  readonly taskId: string;
  readonly userId: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: string;
  readonly priority: number;
  readonly dueAt: string | null;
  readonly parentTaskId: string | null;
  readonly recurrenceRule: string | null;
  readonly timezone: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Note {
  readonly noteId: string;
  readonly userId: string;
  readonly title: string;
  readonly content: string | null;
  readonly tags: string[];
  readonly sourceType: string | null;
  readonly sourceRef: string | null;
  readonly isArchived: boolean;
  readonly objectStorePointer: string | null;
  readonly embedding: number[] | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Draft {
  readonly draftId: string;
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}

/**
 * Nova design system - Finance transaction type.
 * Mirrors nova/services/finance-service/src/finance-entity.ts.
 * All monetary values are integer minor units (spec:826).
 */
export interface FinanceTransaction {
  readonly transactionId: string;
  readonly userId: string;
  readonly source: string; // import provenance: "csv", "ofx", "pdf", "plaid", etc.
  readonly sourceReference: string; // reference within the source file
  readonly amountMinor: number; // integer minor units
  readonly currency: string;
  readonly transactionDate: string; // ISO date
  readonly postedAt: string; // ISO timestamp
  readonly merchant: string;
  readonly category: string;
  readonly categoryConfidence: number; // 0.0 to 1.0
  readonly categoryConfidenceReason: string | null;
  readonly idempotencyKey: string;
  readonly rawJson: Record<string, unknown>;
  readonly createdAt: string; // ISO timestamp
}

/**
 * Nova design system - Aggregated finance summary for a period.
 * Computed deterministically in code from transactions (spec:826).
 */
export interface FinanceSummary {
  readonly netMinor: number; // income minus expenses, integer minor units
  readonly cashFlowMinor: number; // net change over the period
  readonly transactionCount: number;
  readonly categoryTotals: Record<string, number>; // category -> amountMinor
  readonly importCount: number; // distinct sources
}

/**
 * Nova design system - Trip stop (web view model).
 * One stop on a trip route, with optional estimate label.
 */
export interface TripStop {
  readonly stopId: string;
  readonly name: string;
  readonly order: number; // sequence on the route
  readonly arrivalEstimate?: string; // labelled estimate (spec:411)
  readonly departureEstimate?: string; // labelled estimate (spec:411)
}

/**
 * Nova design system - Trip (web view model).
 * Mirrors concepts from trips-service types with web-specific additions.
 */
export interface Trip {
  readonly tripId: string;
  readonly title: string;
  readonly origin: string;
  readonly destination: string;
  readonly startAt: string; // ISO timestamp
  readonly endAt: string; // ISO timestamp
  readonly status: string; // "planned", "active", "completed", "cancelled"
  readonly budgetMinor: number; // integer minor units
  readonly stops: readonly TripStop[];
  readonly routeEstimateLabel?: string; // labelled estimate (spec:411)
}

/**
 * Nova design system - Transport option for a trip leg.
 * Carries an estimate label (spec:411); never a confirmed price.
 */
export interface TransportOption {
  readonly mode: string; // "train", "bus", "flight", "car"
  readonly provider: string;
  readonly estimateMinor: number; // integer minor units, estimate only
  readonly estimateLabel: string; // carries "estimate" (spec:411)
  readonly durationMinutes: number;
  readonly bookingLink?: string; // URL, carries estimate label in UI
}
