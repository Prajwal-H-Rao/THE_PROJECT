/** Tests for the log sanitizer. */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeForLogging, sanitizeString, createSanitizingLogger } from "./log-sanitizer.js";

describe("log sanitizer", () => {
  it("sanitizes JWT tokens in strings", () => {
    const input = "User logged in with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const result = sanitizeString(input);
    assert.ok(!result.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
    assert.ok(result.includes("[REDACTED]"));
  });

  it("sanitizes Bearer tokens in strings", () => {
    const input = "Authorization: Bearer abc123def456";
    const result = sanitizeString(input);
    assert.ok(!result.includes("abc123def456"));
    assert.ok(result.includes("[REDACTED]"));
  });

  it("sanitizes password fields in objects", () => {
    const input = { username: "user1", password: "secret123", email: "user@example.com" };
    const result = sanitizeForLogging(input) as Record<string, unknown>;
    assert.strictEqual(result.username, "user1");
    assert.strictEqual(result.password, "[REDACTED]");
    assert.strictEqual(result.email, "user@example.com");
  });

  it("sanitizes nested objects", () => {
    const input = {
      user: {
        name: "John",
        credentials: {
          api_key: "sk-abc123def456",
          password: "pass123"
        }
      }
    };
    const result = sanitizeForLogging(input) as Record<string, unknown>;
    const user = result.user as Record<string, unknown>;
    const creds = user.credentials as Record<string, unknown>;
    assert.strictEqual(creds.api_key, "[REDACTED]");
    assert.strictEqual(creds.password, "[REDACTED]");
  });

  it("sanitizes arrays of objects", () => {
    const input = [
      { token: "token1", data: "ok" },
      { secret: "secret2", info: "fine" }
    ];
    const result = sanitizeForLogging(input) as Array<Record<string, unknown>>;
    assert.ok(result[0]);
    assert.ok(result[1]);
    assert.strictEqual(result[0].token, "[REDACTED]");
    assert.strictEqual(result[1].secret, "[REDACTED]");
  });

  it("sanitizes credit card numbers", () => {
    const input = "Payment with card 1234-5678-9012-3456 processed";
    const result = sanitizeString(input);
    assert.ok(!result.includes("1234-5678-9012-3456"));
    assert.ok(result.includes("[REDACTED]"));
  });

  it("sanitizes SSN", () => {
    const input = "SSN: 123-45-6789";
    const result = sanitizeString(input);
    assert.ok(!result.includes("123-45-6789"));
    assert.ok(result.includes("[REDACTED]"));
  });

  it("sanitizes GitHub tokens", () => {
    const input = "ghp_abcdefghijklmnopqrstuvwxyz123456";
    const result = sanitizeString(input);
    assert.ok(!result.includes("ghp_abcdefghijklmnopqrstuvwxyz123456"));
    assert.ok(result.includes("[REDACTED]"));
  });

  it("sanitizes AWS keys", () => {
    const input = "AKIAIOSFODNN7EXAMPLE";
    const result = sanitizeString(input);
    assert.ok(!result.includes("AKIAIOSFODNN7EXAMPLE"));
    assert.ok(result.includes("[REDACTED]"));
  });

  it("preserves non-sensitive data", () => {
    const input = { userId: "123", email: "user@example.com", preferences: { theme: "dark" } };
    const result = sanitizeForLogging(input) as Record<string, unknown>;
    assert.strictEqual(result.userId, "123");
    assert.strictEqual(result.email, "user@example.com");
    assert.deepStrictEqual(result.preferences, { theme: "dark" });
  });

  it("handles null and undefined", () => {
    assert.strictEqual(sanitizeForLogging(null), null);
    assert.strictEqual(sanitizeForLogging(undefined), undefined);
  });

  it("handles primitive values", () => {
    assert.strictEqual(sanitizeForLogging(123), 123);
    assert.strictEqual(sanitizeForLogging(true), true);
    assert.strictEqual(sanitizeForLogging("plain string"), "plain string");
  });

  it("createSanitizingLogger wraps logger methods", () => {
    const logs: unknown[] = [];
    const logger = {
      info: (...args: unknown[]) => logs.push(args),
      error: (...args: unknown[]) => logs.push(args),
      warn: (...args: unknown[]) => logs.push(args),
    };
    const sanitized = createSanitizingLogger(logger);
    sanitized.info("User logged in", { password: "secret123" });
    assert.ok(logs.length === 1);
    const args = logs[0] as unknown[];
    assert.strictEqual(args[0], "User logged in");
    const payload = args[1] as Record<string, unknown>;
    assert.strictEqual(payload.password, "[REDACTED]");
  });

  it("sanitizes totpToken field", () => {
    const input = { totpToken: "123456", email: "user@example.com" };
    const result = sanitizeForLogging(input) as Record<string, unknown>;
    assert.strictEqual(result.totpToken, "[REDACTED]");
    assert.strictEqual(result.email, "user@example.com");
  });

  it("test_no_secret_in_logs - acceptance test", () => {
    // This is the acceptance test for Task 16
    // Simulate a request with various secret types
    const requestBody = {
      email: "user@example.com",
      password: "mySecretPassword123",
      totpToken: "123456",
      apiKey: "test_api_key_abcdefghijklmnopqrstuvwxyz",
      creditCard: "4242-4242-4242-4242",
      ssn: "123-45-6789",
      nested: {
        refreshToken: "refresh_token_abc123",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD..."
      }
    };

    const sanitized = sanitizeForLogging(requestBody) as Record<string, unknown>;
    
    // Verify all sensitive fields are redacted
    assert.strictEqual(sanitized.password, "[REDACTED]");
    assert.strictEqual(sanitized.totpToken, "[REDACTED]");
    assert.strictEqual(sanitized.apiKey, "[REDACTED]");
    assert.strictEqual(sanitized.creditCard, "[REDACTED]");
    assert.strictEqual(sanitized.ssn, "[REDACTED]");
    
    const nested = sanitized.nested as Record<string, unknown>;
    assert.strictEqual(nested.refreshToken, "[REDACTED]");
    assert.strictEqual(nested.privateKey, "[REDACTED]");
    
    // Verify non-sensitive fields preserved
    assert.strictEqual(sanitized.email, "user@example.com");
    
    // Verify no secret material remains in the output
    const output = JSON.stringify(sanitized);
    assert.ok(!output.includes("mySecretPassword123"));
    assert.ok(!output.includes("test_api_key_abcdefghijklmnopqrstuvwxyz"));
    assert.ok(!output.includes("4242-4242-4242-4242"));
    assert.ok(!output.includes("123-45-6789"));
    assert.ok(!output.includes("refresh_token_abc123"));
    assert.ok(!output.includes("BEGIN PRIVATE KEY"));
  });
});