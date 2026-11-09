/**
 * Nova design system - Model-drafted category test (task 11.7, module 11).
 * Test-first: written before model-draft.ts. Confirmed failing, then passing.
 * Model-drafted category with confidence and reason; low confidence forces
 * review. Integer minor units throughout (Spec:826); no pg, no credentials
 * (Spec:741); categorize only (Spec:190).
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  classifyWithModel,
  draftToInput,
  type ModelCategoryDraft,
  type ModelClassificationResult,
} from "./model-draft.js";

function draft(overrides: Partial<ModelCategoryDraft> = {}): ModelCategoryDraft {
  return {
    category: "Food",
    confidence: 0.9,
    reason: "Merchant is a grocery store",
    modelId: "nova-fake-model",
    ...overrides,
  };
}

describe("classifyWithModel", () => {
  it("high confidence -> REVIEWED (auto-accept)", () => {
    const result = classifyWithModel(draft({ confidence: 0.95 }));
    assert.strictEqual(result.reviewStatus, "REVIEWED");
    assert.strictEqual(result.category, "Food");
    assert.strictEqual(result.confidence, 0.95);
    assert.strictEqual(result.reason, "Merchant is a grocery store");
  });

  it("low confidence -> NEEDS_REVIEW (forces review)", () => {
    const result = classifyWithModel(draft({ confidence: 0.4 }));
    assert.strictEqual(result.reviewStatus, "NEEDS_REVIEW");
    assert.strictEqual(result.category, "Food");
    assert.strictEqual(result.confidence, 0.4);
  });

  it("boundary exactly at threshold -> REVIEWED", () => {
    const result = classifyWithModel(draft({ confidence: 0.8 }));
    assert.strictEqual(result.reviewStatus, "REVIEWED");
  });

  it("is deterministic: same draft -> same result", () => {
    const d = draft({ confidence: 0.6 });
    const first = classifyWithModel(d);
    const second = classifyWithModel(d);
    assert.deepStrictEqual(first, second);
  });
});

describe("draftToInput", () => {
  it("maps draft + review status to a finance transaction input", () => {
    const d = draft({ confidence: 0.7 });
    const result = classifyWithModel(d);
    const input = draftToInput(d, result, "user-1", "pdf-statement", "ref-1", 123456, "USD", "2026-11-05", "Grocery Store");
    assert.strictEqual(input.userId, "user-1");
    assert.strictEqual(input.amountMinor, 123456);
    assert.strictEqual(input.category, "Food");
    assert.strictEqual(input.categoryConfidence, 0.7);
    assert.strictEqual(input.categoryConfidenceReason, "Merchant is a grocery store");
    assert.strictEqual(input.idempotencyKey, "ref-1");
  });
});
