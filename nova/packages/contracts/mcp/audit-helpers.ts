/**
 * MCP audit event validation helpers.
 * Provides UUID/ISO 8601/hex validation, secret-key scanning, and the
 * known field set for MCP audit events. Used by audit-event.ts.
 */

import {
  isValidUUID,
  isValidISO8601,
  validateOptionalString,
} from "./mcp-helpers.js";

export { isValidUUID, isValidISO8601, validateOptionalString } from "./mcp-helpers.js";

/** Validate that a string is a hexadecimal value. Returns true when valid. */
export function isValidHex(str: string): boolean {
  return /^[0-9a-f]+$/i.test(str);
}

const FORBIDDEN_KEYS = new Set([
  "password",
  "secret",
  "token",
  "key",
  "jwt",
  "authorization",
  "access_token",
  "refresh_token",
  "api_key",
  "private_key",
  "apikey",
  "accesstoken",
  "refreshtoken",
  "privatekey",
  "secretkey",
  "apisecret",
  "clientsecret",
  "clientid",
  "authtoken",
  "bearertoken",
  "idtoken",
]);

/** Recursively scan an object for forbidden secret keys.
 * Throws when any key matches a forbidden key at any nesting depth. */
export function checkForSecrets(obj: unknown, path: string = "", visited = new WeakSet<object>()): void {
  if (!obj || typeof obj !== "object") {
    return;
  }
  if (visited.has(obj as object)) {
    return;
  }
  visited.add(obj as object);

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      checkForSecrets(obj[i], `${path}[${i}]`, visited);
    }
    return;
  }
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_KEYS.has(lowerKey)) {
      throw new Error(`Payload contains forbidden key: ${path ? `${path}.` : ""}${key}`);
    }
    const value = record[key];
    if (value && typeof value === "object") {
      checkForSecrets(value, path ? `${path}.${key}` : key, visited);
    }
  }
}

export const KNOWN_MCP_AUDIT_EVENT_FIELDS = new Set([
  "event_id",
  "event_type",
  "schema_version",
  "occurred_at",
  "producer",
  "correlation_id",
  "causation_id",
  "actor_type",
  "actor_id",
  "action",
  "resource_type",
  "resource_id",
  "policy_result",
  "policy_version",
  "execution_status",
  "verification_type",
  "evidence_ref",
  "payload",
  "previous_hash",
  "row_hash",
]);
