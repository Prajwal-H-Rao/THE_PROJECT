/** MCP (Model Context Protocol) surface contracts for NOVA.
 * This package defines the wire format for MCP tool calls, the tool catalogue schema,
 * the error envelope, and the audit event shape that every MCP server must emit.
 */

export {
  ToolDefinition,
  ToolArgumentSchema,
  ToolResult,
  ToolError,
  ToolRiskTier,
  ToolIdempotency,
  ToolClassification,
  validate_tool_definition,
} from "./tool.js";

export {
  MCPCall,
  MCPResponse,
  MCPError,
  MCPErrorCode,
  MCPCallContext,
  validate_mcp_call,
  validate_mcp_response,
} from "./call.js";

export {
  MCPAuditEvent,
  MCPAuditEventType,
  MCPAuditContext,
  validate_mcp_audit_event,
} from "./audit.js";