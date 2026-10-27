/** MCP Client - The orchestrator's only path to tools. */

import { MCPCall, MCPResponse, validate_mcp_call, validate_mcp_response } from "../../packages/contracts/mcp/call.js";
import { ToolDefinition } from "../../packages/contracts/mcp/tool.js";

/** Configuration for the MCP client. */
export interface MCPClientConfig {
  /** Base URL of the MCP server. */
  baseUrl: string;
  /** Service JWT for authentication. */
  serviceJWT: string;
  /** Audience for the service token. */
  audience: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
}

/** Result of a tool call through the MCP client. */
export interface MCPClientResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** MCP Client for calling tools through the MCP server. */
export class MCPClient {
  private config: MCPClientConfig;
  
  constructor(config: MCPClientConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }
  
  /** Call a tool through the MCP server. */
  async callTool<T = unknown>(
    toolName: string,
    arguments_: Record<string, unknown>,
    options: {
      idempotencyKey?: string;
      userId?: string;
      correlationId?: string;
      approvalGrant?: string;
    } = {}
  ): Promise<MCPClientResult<T>> {
    const callId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    const call: MCPCall = {
      call_id: callId,
      tool: toolName,
      arguments: arguments_,
      idempotency_key: options.idempotencyKey,
      service_jwt: this.config.serviceJWT,
      user_id: options.userId,
      correlation_id: options.correlationId,
      created_at: createdAt,
    };
    
    // Validate call structure locally first
    try {
      validate_mcp_call(call);
    } catch (e) {
      return { ok: false, error: { code: "validation_failed", message: String(e) } };
    }
    
    // Make HTTP request to MCP server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.serviceJWT}`,
        },
        body: JSON.stringify({
          ...call,
          approval_grant: options.approvalGrant,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: {
            code: errorData.code || "server_error",
            message: errorData.message || `HTTP ${response.status}`,
          },
        };
      }
      
      const responseData = await response.json();
      
      // Validate response structure
      try {
        const validated = validate_mcp_response(responseData);
        
        if (!validated.ok) {
          return {
            ok: false,
            error: validated.error ? {
              code: validated.error.code,
              message: validated.error.message,
            } : { code: "tool_execution_failed", message: "Tool execution failed" },
          };
        }
        
        return {
          ok: true,
          data: validated.result as T,
        };
      } catch (e) {
        return { ok: false, error: { code: "validation_failed", message: String(e) } };
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return { ok: false, error: { code: "tool_timeout", message: "Request timed out" } };
      }
      return { ok: false, error: { code: "internal_error", message: String(e) } };
    }
  }
  
  /** Check if a tool is registered (local catalogue check). */
  async isToolRegistered(toolName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/tools/${toolName}`, {
        headers: {
          "Authorization": `Bearer ${this.config.serviceJWT}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /** List available tools from the server. */
  async listTools(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/tools`, {
        headers: {
          "Authorization": `Bearer ${this.config.serviceJWT}`,
        },
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.tools?.map((t: { name: string }) => t.name) || [];
    } catch {
      return [];
    }
  }
}

/** Create an MCP client from environment variables. */
export function createMCPClientFromEnv(): MCPClient {
  return new MCPClient({
    baseUrl: process.env.NOVA_MCP_SERVER_URL || "http://localhost:8003",
    serviceJWT: process.env.NOVA_SERVICE_JWT!,
    audience: process.env.NOVA_SERVICE_TOKEN_AUDIENCE || "nova-mcp",
    timeout: parseInt(process.env.NOVA_MCP_TIMEOUT || "30000", 10),
  });
}