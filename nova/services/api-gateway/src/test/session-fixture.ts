/** The test client helper. It signs the tokens and it calls the gateway. */

import { createHmac } from "node:crypto";

import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";

/** The claims that the tests use. */
export interface TestClaims {
  readonly sub?: string;
  readonly sid?: string;
  readonly tenant?: string;
  readonly channel?: string;
  readonly csrf?: string;
  readonly iat?: number;
  readonly exp?: number;
}

/** The options of the test client. */
export interface ClientOptions {
  readonly cookie?: string;
  readonly token?: string;
  readonly origin?: string;
  readonly csrfToken?: string;
  readonly correlationId?: string;
}

/** Return the claims that a test needs. */
export function makeClaims(overrides: TestClaims = {}): Required<TestClaims> {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: overrides.sub ?? "user-1",
    sid: overrides.sid ?? "session-1",
    tenant: overrides.tenant ?? "tenant-1",
    channel: overrides.channel ?? "web",
    csrf: overrides.csrf ?? "csrf-token-1",
    iat: overrides.iat ?? now,
    exp: overrides.exp ?? now + 3600,
  };
}

/** Sign a session token for the tests. */
export function signToken(claims: Required<TestClaims>, secret: string): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update("v1." + payload).digest("base64url");
  return "v1." + payload + "." + signature;
}

/** Return the cookie header that carries a session token. */
export function sessionCookie(token: string): string {
  return "nova_session=" + token;
}

/** Return the cookie header that carries the csrf token. */
export function csrfCookie(csrf: string): string {
  return "nova_csrf=" + csrf;
}

/** Return the axios client of the gateway. The interceptors carry the request context. */
export function gatewayClient(baseUrl: string, options: ClientOptions = {}): AxiosInstance {
  const client = axios.create({ baseURL: baseUrl, validateStatus: () => true });
  client.interceptors.request.use((config) => {
    const headers = config.headers;
    if (options.cookie !== undefined) {
      headers.set("cookie", options.cookie);
    }
    if (options.token !== undefined) {
      headers.set("authorization", "Session " + options.token);
    }
    if (options.origin !== undefined) {
      headers.set("origin", options.origin);
    }
    if (options.csrfToken !== undefined) {
      headers.set("x-csrf-token", options.csrfToken);
    }
    if (options.correlationId !== undefined) {
      headers.set("x-correlation-id", options.correlationId);
    }
    return config;
  });
  client.interceptors.response.use((response) => {
    Object.assign(response, { traceId: String(response.headers["x-correlation-id"] ?? "") });
    return response;
  });
  return client;
}

/** Return the trace id that the answer carries. */
export function traceIdOf(response: AxiosResponse): string {
  const value = (response as unknown as { traceId?: string }).traceId;
  return value ?? "";
}
