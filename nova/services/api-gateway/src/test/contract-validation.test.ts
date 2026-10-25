/** Tests for the contract validator of the gateway. The module holds no
 * imports itself, so the unit tests seed plain schema objects directly. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SCHEMAS,
  validateAgainstSchema,
  validateContract,
} from "../lib/contract-validation.js";

/** Pull the error body out of a Response. */
async function errorBodyOf(response: Response): Promise<Record<string, unknown>> {
  const body = (await response.json()) as Record<string, unknown>;
  return body;
}

describe("validateAgainstSchema", () => {
  it("accepts a valid object", () => {
    const result = validateAgainstSchema({ title: "write tests" }, SCHEMAS["tasks/create"]);
    assert.ok(result.ok);
  });

  it("rejects a missing required field", () => {
    const result = validateAgainstSchema({}, SCHEMAS["tasks/create"]);
    assert.deepEqual(result, { ok: false, errors: ["$.title: required field missing"] });
  });

  it("rejects unexpected properties when additionalProperties is false", () => {
    const result = validateAgainstSchema({ title: "t", extra: 1 }, SCHEMAS["tasks/create"]);
    assert.ok(result.ok === false);
    assert.ok(result.errors.join("; ").includes("$.extra: unexpected property"));
  });

  it("checks string length bounds and enums", () => {
    const bad = validateAgainstSchema(
      { title: "x".repeat(300) },
      SCHEMAS["tasks/create"],
    );
    assert.ok(bad.ok === false && bad.errors.some((message) => message.includes("too long")));
    const notEnum = validateAgainstSchema(
      { title: "t", priority: "urgent" } as Record<string, string>,
      SCHEMAS["tasks/create"],
    );
    assert.ok(notEnum.ok === false && notEnum.errors.some((message) => message.includes("enum")));
  });

  it("separates numbers from integers and holds minimum and maximum", () => {
    const numberSchema = { type: "number", minimum: 0, maximum: 10.5 };
    assert.ok(validateAgainstSchema(10.5, numberSchema).ok);
    assert.deepEqual(validateAgainstSchema(-1, numberSchema), {
      ok: false, errors: ["$: value below minimum 0"],
    });
    const integerSchema = { type: "integer" };
    assert.ok(validateAgainstSchema(3, integerSchema).ok);
    assert.deepEqual(validateAgainstSchema(3.2, integerSchema).ok, false);
    assert.deepEqual(validateAgainstSchema("3", integerSchema), {
      ok: false, errors: ["$: expected number"],
    });
  });

  it("walks arrays and nested schemas", () => {
    const schema = {
      type: "array",
      items: { type: "string", minLength: 2 } as const,
    };
    const result = validateAgainstSchema(["aa", "b"], schema);
    assert.deepEqual(result, { ok: false, errors: ["$[1]: string too short (min 2)"] });
  });

  it("holds the date-time format", () => {
    const schema = { type: "string", format: "date-time" } as const;
    assert.ok(validateAgainstSchema("2026-01-02T10:00:00Z", schema).ok);
    assert.ok(validateAgainstSchema("not-a-date", schema).ok === false);
  });

  it("answers expected object for non-object values", () => {
    assert.ok(validateAgainstSchema("nope", SCHEMAS["tasks/create"]).ok === false);
    assert.ok(validateAgainstSchema([], SCHEMAS["tasks/create"]).ok === false);
  });
});

describe("validateContract", () => {
  const TRACE = "trace-test-001";

  it("applies the contract for a mapped POST path and passes a valid body", () => {
    const good = validateContract("/api/v1/tasks", "POST", JSON.stringify({ title: "t" }), TRACE);
    assert.equal(good, null);
  });

  it("answers invalid_json for a malformed body", async () => {
    const response = validateContract("/api/v1/tasks", "POST", "{not json", TRACE);
    assert.ok(response !== null);
    assert.equal(response.status, 400);
    const body = await errorBodyOf(response);
    assert.equal(body.error, "invalid_json");
    assert.equal(body.trace_id, TRACE);
  });

  it("answers validation_failed with the reasons in details", async () => {
    const response = validateContract("/api/v1/tasks", "POST", JSON.stringify({ note: 1 }), TRACE);
    assert.ok(response !== null);
    const body = await errorBodyOf(response);
    assert.equal(body.error, "validation_failed");
    assert.match(String(body.details), /required field missing/);
    assert.match(String(body.details), /unexpected property/);
  });

  it("skips bodies without a contract and skips GET and DELETE", () => {
    assert.equal(validateContract("/api/v1/nobody", "POST", "garbage", TRACE), null);
    assert.equal(validateContract("/api/v1/tasks", "GET", "garbage", TRACE), null);
    assert.equal(validateContract("/api/v1/tasks", "DELETE", "garbage", TRACE), null);
    assert.equal(validateContract("/api/v1/tasks", "PUT", JSON.stringify({ title: "t" }), TRACE), null);
  });

  it("holds a decoded path against percent-encoded misses", () => {
    const good = validateContract("/api/v1/%74asks", "POST", JSON.stringify({ title: "t" }), TRACE);
    assert.equal(good, null);
    const encoded = validateContract("/api/v1/%74asks", "POST", "{broken", TRACE);
    assert.ok(encoded !== null);
  });

  it("validates the internal echo POST body", () => {
    assert.equal(validateContract("/api/internal/echo", "POST", JSON.stringify({ message: "hi" }), TRACE), null);
    assert.ok(validateContract("/api/internal/echo", "POST", "{}", TRACE) !== null);
  });

  it("validates the finance import source enum", () => {
    assert.equal(
      validateContract("/api/v1/finance/import", "POST", JSON.stringify({ source: "csv", data: "x" }), TRACE),
      null,
    );
    assert.ok(
      validateContract("/api/v1/finance/import", "POST", JSON.stringify({ source: "xlsx", data: "x" }), TRACE) !== null,
    );
  });
});
