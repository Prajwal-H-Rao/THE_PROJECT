/**
 * MCP tool definition types and constants.
 * Defines ToolRiskTier, ToolIdempotency, ToolClassification, CanonicalFamily
 * and their value sets plus KNOWN_TOOL_DEFINITION_FIELDS.
 * All type definitions live here; validation logic is in tool-validate.ts.
 */

export type ToolRiskTier = "tier1" | "tier2" | "tier3" | "tier4";
export type ToolIdempotency = "none" | "idempotency_key" | "natural";
export type ToolClassification = "read" | "write";

export const ToolRiskTierValues: readonly ToolRiskTier[] = [
  "tier1",
  "tier2",
  "tier3",
  "tier4",
] as const;
export const ToolIdempotencyValues: readonly ToolIdempotency[] = [
  "none",
  "idempotency_key",
  "natural",
] as const;
export const ToolClassificationValues: readonly ToolClassification[] = [
  "read",
  "write",
] as const;

// Canonical task families (spec §183-193)
export type CanonicalFamily =
  | "inbox"
  | "calendar_tasks"
  | "notes_memory"
  | "finance"
  | "trips"
  | "resume_jobs"
  | "integrations";

export const CanonicalFamilyValues: readonly CanonicalFamily[] = [
  "inbox",
  "calendar_tasks",
  "notes_memory",
  "finance",
  "trips",
  "resume_jobs",
  "integrations",
] as const;

export interface ToolArgumentSchema {
  schema: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  arguments: { schema: Record<string, unknown> };
  output: { schema: Record<string, unknown> };
  allowed_roles?: string[];
  allowed_scopes?: string[];
  classification: ToolClassification;
  risk_tier: ToolRiskTier;
  idempotency: ToolIdempotency;
  timeout?: string;
  version: number;
  provider_allowlist?: string[];
  quota?: string;
  verifier: string;
  family: CanonicalFamily;
  operation_id: string;
  owning_service: string;
  mcp_server: string;
  resource_scope: string;
}

export interface ToolOutputSchema {
  schema: Record<string, unknown>;
}

export interface ToolError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: ToolError;
}

export const KNOWN_TOOL_DEFINITION_FIELDS = new Set([
  "name",
  "description",
  "arguments",
  "output",
  "allowed_roles",
  "allowed_scopes",
  "classification",
  "risk_tier",
  "idempotency",
  "timeout",
  "version",
  "provider_allowlist",
  "quota",
  "verifier",
  "family",
  "operation_id",
  "owning_service",
  "mcp_server",
  "resource_scope",
]);
