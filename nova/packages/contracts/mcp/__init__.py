"""MCP (Model Context Protocol) surface contracts for NOVA.

This package defines the wire format for MCP tool calls, the tool catalogue schema,
the error envelope, and the audit event shape that every MCP server must emit.
"""

from .tool import (
    ToolDefinition,
    ToolArgumentSchema,
    ToolResult,
    ToolError,
    validate_tool_definition,
)
from .call import (
    MCPCall,
    MCPResponse,
    MCPError,
    MCPErrorCode,
    validate_mcp_call,
    validate_mcp_response,
)
from .audit import (
    MCPAuditEvent,
    MCPAuditEventType,
    validate_mcp_audit_event,
)

__all__ = [
    "ToolDefinition",
    "ToolArgumentSchema",
    "ToolResult",
    "ToolError",
    "validate_tool_definition",
    "MCPCall",
    "MCPResponse",
    "MCPError",
    "MCPErrorCode",
    "validate_mcp_call",
    "validate_mcp_response",
    "MCPAuditEvent",
    "MCPAuditEventType",
    "validate_mcp_audit_event",
]