/**
 * Tests for the WhatsApp signature validator (task 14.1).
 * Verifies HMAC-SHA256 signature verification with constant-time comparison.
 * Claim C12: WhatsApp signature is X-Hub-Signature-256, HMAC-SHA256 over
 * the raw body, `sha256=` prefix.
 */

import * as assert from "node:assert";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { SignatureValidator } from "./signature.js";

test("accepts a valid signature", () => {
  const appSecret = "my-app-secret";
  const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
  const signature = `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`;
  const validator = new SignatureValidator(appSecret);
  assert.ok(validator.isValid(body, signature));
});

test("rejects an undefined signature", () => {
  const validator = new SignatureValidator("my-app-secret");
  assert.ok(!validator.isValid("body", undefined));
});

test("rejects a null signature", () => {
  const validator = new SignatureValidator("my-app-secret");
  assert.ok(!validator.isValid("body", null as unknown as string));
});

test("rejects an empty signature", () => {
  const validator = new SignatureValidator("my-app-secret");
  assert.ok(!validator.isValid("body", ""));
});

test("rejects a wrong signature", () => {
  const validator = new SignatureValidator("my-app-secret");
  assert.ok(!validator.isValid("body", "sha256=wrongsignature"));
});

test("rejects when app secret is not configured", () => {
  const validator = new SignatureValidator("");
  assert.ok(!validator.isValid("body", "sha256=anysignature"));
});

test("rejects a tampered body", () => {
  const appSecret = "my-app-secret";
  const body1 = JSON.stringify({ object: "whatsapp_business_account" });
  const body2 = JSON.stringify({ object: "different_object" });
  const signature = `sha256=${createHmac("sha256", appSecret).update(body1).digest("hex")}`;
  const validator = new SignatureValidator(appSecret);
  assert.ok(!validator.isValid(body2, signature));
});

test("constant-time comparison: different lengths rejected", () => {
  const validator = new SignatureValidator("short");
  assert.ok(!validator.isValid("body", "sha256=muchlongersignaturethatiswrong"));
});
