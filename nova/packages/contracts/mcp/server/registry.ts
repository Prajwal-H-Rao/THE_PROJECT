/** MCP server library: tool registration, validation, and dispatch. */

import { ToolDefinition, validate_tool_definition, CanonicalFamily } from "../tool.js";
import { validate_mcp_call, MCPCall, MCPCallContext } from "../call.js";
import { validate_mcp_audit_event, MCPAuditEvent } from "../audit.js";
import { verifyToken, VerifyOptions, ServiceClaims } from "../../service-token.js";
import { verifyGrant } from "../../grant-verification.js";

/** Loaded tool catalogue. */
export interface ToolCatalogue {
  readonly tools: Map<string, ToolDefinition>;
  readonly byFamily: Map<CanonicalFamily, ToolDefinition[]>;
}

/** Load and validate the tool catalogue from JSON files. */
export function loadCatalogue(catalogueDir: string): ToolCatalogue {
  const fs = require("fs");
  const path = require("path");
  
  const tools = new Map<string, ToolDefinition>();
  const byFamily = new Map<CanonicalFamily, ToolDefinition[]>();
  
  const files = fs.readdirSync(catalogueDir).filter(f => f.endsWith(".json"));
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(catalogueDir, file), "utf8");
    const familyData = JSON.parse(content);
    
    for (const op of familyData.operations) {
      const toolDef = validate_tool_definition(op);
      tools.set(toolDef.name, toolDef);
      
      const familyTools = byFamily.get(toolDef.family) || [];
      familyTools.push(toolDef);
      byFamily.set(toolDef.family, familyTools);
    }
  }
  
  return { tools, byFamily };
}

/** Verify service JWT and extract claims. */
export function verifyServiceJWT(
  token: string,
  options: VerifyOptions
): { ok: true; claims: ServiceClaims } | { ok: false; reason: string } {
  return verifyToken(token, process.env.NOVA_SERVICE_JWT_SECRET!, options, Math.floor(Date.now() / 1000));
}

/** Check if a call is authorized for the given tool. */
export function authorizeCall(
  call: MCPCall,
  tool: ToolDefinition,
  claims: ServiceClaims
): { ok: true } | { ok: false; reason: string } {
  // Check scopes
  if (tool.allowed_scopes && tool.allowed_scopes.length > 0) {
    const callScopes = claims.scope.split(" ");
    const hasScope = tool.allowed_scopes.some(s => callScopes.includes(s));
    if (!hasScope) {
      return { ok: false, reason: "missing_scope" };
    }
  }
  
  // Check roles
  if (tool.allowed_roles && tool.allowed_roles.length > 0) {
    // Service-to-service calls use service identity, not user roles
    // This is a placeholder for role-based checks
  }
  
  return { ok: true };
}

/** Validate and authorize an MCP call. */
export function validateAndAuthorizeCall(
  rawCall: Record<string, unknown>,
  catalogue: ToolCatalogue,
  serviceJWT: string,
  audience: string
): { ok: true; context: MCPCallContext } | { ok: false; error: string; code: string } {
  // Validate call structure
  let mcpCall: MCPCall;
  try {
    mcpCall = validate_mcp_call(rawCall);
  } catch (e) {
    return { ok: false, error: String(e), code: "validation_failed" };
  }
  
  // Find tool
  const tool = catalogue.tools.get(mcpCall.tool);
  if (!tool) {
    return { ok: false, error: `Tool not found: ${mcpCall.tool}`, code: "tool_not_found" };
  }
  
  // Verify service JWT
  const jwtResult = verifyServiceJWT(serviceJWT, {
    issuer: process.env.NOVA_SERVICE_JWT_ISSUER!,
    audience,
    requiredScope: tool.allowed_scopes?.[0],
  });
  
  if (!jwtResult.ok) {
    return { ok: false, error: "Invalid service token", code: jwtResult.reason };
  }
  
  // Authorize
  const authResult = authorizeCall(mcpCall, tool, jwtResult.claims);
  if (!authResult.ok) {
    return { ok: false, error: "Authorization failed", code: authResult.reason };
  }
  
  // Check approval grant for consequential tools
  if (tool.risk_tier === "tier3" || tool.risk_tier === "tier4") {
    if (!mcpCall.approval_grant) {
      return { ok: false, error: "Approval grant required", code: "approval_required" };
    }
    
    // Verify the grant
    const grantResult = verifyGrant(mcpCall.approval_grant, {
      tool: tool.name,
      userId: mcpCall.user_id!,
      payloadHash: mcpCall.arguments, // Simplified - should hash the actual payload
    });
    
    if (!grantResult.ok) {
      return { ok: false, error: "Invalid or expired approval grant", code: "approval_revoked" };
    }
  }
  
  return {
    ok: true,
    context: {
      call: mcpCall,
      tool_definition: tool,
      user_id: mcpCall.user_id!,
      roles: [], // Would be populated from claims
      scopes: jwtResult.claims.scope.split(" "),
      approval_grant: mcpCall.approval_grant,
    },
  };
}

/** Create an audit event for an MCP call. */
export function createAuditEvent(
  context: MCPCallContext,
  policyResult: "allowed" | "denied" | "step_up" | "error" | "not_evaluated" | "approval_required",
  executionStatus: "pending" | "succeeded" | "failed" | "compensated" | "planned" | "awaiting_approval" | "approved" | "executing" | "cancelled" | "needs_manual_action",
  verificationType: "none" | "signature" | "receipt" | "external" | "human",
  evidenceRef: string | undefined,
  payload: Record<string, unknown>,
  previousHash?: string,
): MCPAuditEvent {
  const event: MCPAuditEvent = {
    event_id: crypto.randomUUID(),
    event_type: "mcp.call.executed",
    schema_version: 1,
    occurred_at: new Date().toISOString(),
    producer: context.tool_definition.owning_service,
    correlation_id: context.call.correlation_id,
    actor_type: "service",
    actor_id: context.user_id,
    action: context.call.tool,
    resource_type: context.tool_definition.resource_scope,
    policy_result: policyResult,
    policy_version: 1,
    execution_status: executionStatus,
    verification_type: verificationType,
    evidence_ref: evidenceRef,
    payload: {
      tool: context.call.tool,
      arguments: context.call.arguments,
      ...payload,
    },
    previous_hash: previousHash,
    row_hash: "", // Will be set by audit service
  };
  
  return event;
}