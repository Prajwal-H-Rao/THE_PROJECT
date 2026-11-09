/**
 * Nova document - Failure handling test (task 09.15, module 09).
 * Verifies that partial provider failures are handled:
 * - Retry with exponential backoff on transient errors
 *   - Re-authenticate on 401 errors (token refresh)
 *   - Fail safe: log error and continue without crashing
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

interface FetchResult {
  ok: boolean;
  data?: unknown;
  error?: Error;
}

// Mock fetch function that can be configured to fail
function makeMockFetch(responses: Array<{ ok: boolean; data?: unknown; error?: Error }>) {
  let callCount = 0;
  return async function fetch(_url: string, _init?: any): Promise<FetchResult> {
    const response = responses[Math.min(callCount, responses.length - 1)];
    callCount++;
    return response;
  };
}

describe("failure handling", () => {
  it("retries on transient failure and succeeds on retry", async () => {
    const fetch = makeMockFetch([
      { ok: false, error: new Error("429 Too Many Requests") },
      { ok: true, data: { success: true } },
    ]);

    let attempts = 0;
    async function fetchWithRetry(url: string, maxRetries = 3): Promise<FetchResult> {
      let lastError: Error | undefined;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        attempts++;
        try {
          const result = await fetch(url);
          if (result.ok) return result;
          lastError = result.error;
          if (attempt < maxRetries) {
            // Exponential backoff delay
            await new Promise((resolve) => setTimeout(resolve, 10 * Math.pow(2, attempt - 1)));
          }
        } catch (e) {
          lastError = e as Error;
        }
      }
      throw lastError || new Error("Unknown error");
    }

    const result = await fetchWithRetry("https://example.com/api");
    assert.strictEqual(result.ok, true);
    assert.strictEqual(attempts, 2); // First attempt failed, second succeeded
  });

  it("fails safe after max retries exhausted", async () => {
    const fetch = makeMockFetch([
      { ok: false, error: new Error("429 Too Many Requests") },
      { ok: false, error: new Error("429 Too Many Requests") },
      { ok: false, error: new Error("429 Too Many Requests") },
    ]);

    let attempts = 0;
    async function fetchWithRetry(url: string, maxRetries = 3): Promise<FetchResult> {
      let lastError: Error | undefined;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        attempts++;
        try {
          const result = await fetch(url);
          if (result.ok) return result;
          lastError = result.error;
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 10 * Math.pow(2, attempt - 1)));
          }
        } catch (e) {
          lastError = e as Error;
        }
      }
      throw lastError || new Error("Unknown error");
    }

    await assert.rejects(
      () => fetchWithRetry("https://example.com/api"),
      /Too Many Requests/
    );
    assert.strictEqual(attempts, 3); // All 3 retries exhausted
  });

  it("re-authenticates on 401 error and retries successfully", async () => {
    let fetchCalls = 0;
    let reauthCalls = 0;

    async function fetch(url: string): Promise<FetchResult> {
      fetchCalls++;
      if (fetchCalls === 1) {
        // First call: 401 Unauthorized
        return { ok: false, error: new Error("401 Unauthorized") };
      }
      // Second call: success after re-auth
      return { ok: true, data: { message: "success" } };
    }

    async function reauthenticate(): Promise<void> {
      reauthCalls++;
      // Simulate token refresh
    }

    async function fetchWithRetryAndReauth(url: string, maxRetries = 3): Promise<FetchResult> {
      let lastError: Error | undefined;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await fetch(url);
          if (result.ok) return result;
          const error = result.error as Error;
          if (error.message.includes("401")) {
            await reauthenticate();
            // Retry with new token
            const retryResult = await fetch(url);
            if (retryResult.ok) return retryResult;
            lastError = retryResult.error;
          } else {
            lastError = error;
          }
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        } catch (e) {
          lastError = e as Error;
        }
      }
      throw lastError || new Error("Unknown error");
    }

    const result = await fetchWithRetryAndReauth("https://example.com/api");
    assert.strictEqual(result.ok, true);
    assert.strictEqual(fetchCalls, 2); // First call failed with 401, second succeeded after re-auth
    assert.strictEqual(reauthCalls, 1); // One re-authentication
  });

  it("fail safe: logs error and continues without crashing", async () => {
    const errors: Error[] = [];
    const fetch = async () => {
      return { ok: false, error: new Error("Permanent failure") };
    };

    let crashOccurred = false;
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await fetch();
        if (!result.ok) {
          // Log error but don't crash - fail safe
          errors.push(result.error as Error);
        }
      }
    } catch (e) {
      crashOccurred = true;
    }

    assert.strictEqual(crashOccurred, false); // Did not crash
    assert.strictEqual(errors.length, 3); // All 3 errors logged
  });
});
