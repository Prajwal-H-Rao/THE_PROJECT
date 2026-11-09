/**
 * Tests for the bounded fetch tool's URL allow-list validation.
 * Verifies that fetch refuses URLs whose hostname is not in the
 * provider_allowlist (spec:149, spec:503).
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { validateFetchURL } from "./fetch-validate.js";

const ALLOW_LIST = ["example.com", "api.local"];

describe("fetch URL allow-list validation", () => {
  it("refuses a URL outside the allow-list", () => {
    const result = validateFetchURL("https://evil.example.net/steal", ALLOW_LIST);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "url_not_in_allowlist");
  });

  it("allows a URL whose hostname is in the allow-list", () => {
    const result = validateFetchURL("https://example.com/page", ALLOW_LIST);
    assert.equal(result.ok, true);
  });

  it("allows a subdomain of an allow-listed domain", () => {
    const result = validateFetchURL("https://api.example.com/page", ALLOW_LIST);
    assert.equal(result.ok, true);
  });

  it("refuses a URL whose parent domain is not allow-listed", () => {
    const result = validateFetchURL("https://example.evil.com/page", ALLOW_LIST);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "url_not_in_allowlist");
  });

  it("rejects a malformed URL", () => {
    const result = validateFetchURL("not-a-url", ALLOW_LIST);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_url");
  });
});
