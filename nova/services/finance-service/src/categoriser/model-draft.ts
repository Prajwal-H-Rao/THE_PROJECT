/**
 * Nova design system - Model-drafted category (task 11.7, module 11).
 * Consumes a model-drafted category (from the model-gateway) with its
 * confidence and reason, and applies the review rule: low confidence
 * forces review (NEEDS_REVIEW), high confidence is auto-accepted
 * (REVIEWED) but remains marked as model-drafted. Integer minor units
 * throughout (Spec:826); no pg, no credentials (Spec:741); categorize
 * only, no movement of money (Spec:190).
 */

import type { CreateFinanceTransactionInput } from "../finance-entity.js";

export interface ModelCategoryDraft {
  readonly category: string;
  readonly confidence: number; // 0.0 to 1.0
  readonly reason: string;
  readonly modelId: string;
}

export interface ModelClassificationResult {
  readonly category: string;
  readonly confidence: number;
  readonly reason: string;
  readonly modelId: string;
  readonly reviewStatus: "REVIEWED" | "NEEDS_REVIEW";
}

// Purpose: default review threshold. Confidence strictly below this forces
// review; confidence at or above this is auto-accepted.
export const REVIEW_THRESHOLD = 0.8;

// Purpose: classify a model-drafted category. Low confidence forces review
// (NEEDS_REVIEW); confidence at or above threshold is auto-accepted
// (REVIEWED) but remains marked as model-drafted. Deterministic: same
// draft always yields the same result.
export function classifyWithModel(
  draft: ModelCategoryDraft,
  reviewThreshold: number = REVIEW_THRESHOLD,
): ModelClassificationResult {
  const reviewStatus =
    draft.confidence < reviewThreshold ? "NEEDS_REVIEW" : "REVIEWED";
  return {
    category: draft.category,
    confidence: draft.confidence,
    reason: draft.reason,
    modelId: draft.modelId,
    reviewStatus,
  };
}

// Purpose: convert a model draft + classification result into a finance
// transaction input carrying the category confidence and reason.
export function draftToInput(
  draft: ModelCategoryDraft,
  result: ModelClassificationResult,
  userId: string,
  source: string,
  sourceReference: string,
  amountMinor: number,
  currency: string,
  transactionDate: string,
  merchant: string,
): CreateFinanceTransactionInput {
  return {
    userId,
    source,
    sourceReference,
    amountMinor,
    currency,
    transactionDate,
    postedAt: transactionDate,
    merchant,
    category: draft.category,
    categoryConfidence: draft.confidence,
    categoryConfidenceReason: draft.reason,
    idempotencyKey: sourceReference,
    rawJson: {
      modelId: draft.modelId,
      reviewStatus: result.reviewStatus,
      confidence: draft.confidence,
    },
  };
}
