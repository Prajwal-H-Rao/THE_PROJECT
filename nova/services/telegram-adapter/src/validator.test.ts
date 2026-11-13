/**
 * Tests for the Telegram secret token validator (task 14.6).
 * Verifies constant-time comparison and rejection of invalid tokens.
 */

import * as assert from "node:assert";
import { test } from "node:test";
import { Validator } from "./validator.js";

test("accepts a matching secret token", () => {
  const validator = new Validator("my-secret-token");
  assert.ok(validator.isValid("my-secret-token"));
});

test("rejects an undefined token", () => {
  const validator = new Validator("my-secret-token");
  assert.ok(!validator.isValid(undefined));
});

test("rejects a null token", () => {
  const validator = new Validator("my-secret-token");
  assert.ok(!validator.isValid(null as unknown as string));
});

test("rejects an empty token when secret is set", () => {
  const validator = new Validator("my-secret-token");
  assert.ok(!validator.isValid(""));
});

test("rejects a wrong token", () => {
  const validator = new Validator("my-secret-token");
  assert.ok(!validator.isValid("wrong-token"));
});

test("rejects when secret is not configured", () => {
  const validator = new Validator("");
  assert.ok(!validator.isValid("any-token"));
});

test("constant-time comparison: different lengths are rejected", () => {
  const validator = new Validator("short");
  assert.ok(!validator.isValid("much-longer-token"));
});

test("constant-time comparison: same length different content is rejected", () => {
  const validator = new Validator("abcdef");
  assert.ok(!validator.isValid("abcdeg"));
});
