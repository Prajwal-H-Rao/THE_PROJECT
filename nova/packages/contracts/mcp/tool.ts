/** MCP tool definition contract - barrel re-export.
 * Re-exports types, constants, values and validation from tool-types.js
 * and tool-validate.js. Consumers import from ./tool.js unchanged.
 */

export {
  ToolDefinition,
  ToolArgumentSchema,
  ToolOutputSchema,
  ToolError,
  ToolResult,
  ToolRiskTier,
  ToolIdempotency,
  ToolClassification,
  CanonicalFamily,
  CanonicalFamilyValues,
  ToolRiskTierValues,
  ToolIdempotencyValues,
  ToolClassificationValues,
  KNOWN_TOOL_DEFINITION_FIELDS,
} from "./tool-types.js";

export {
  validateSchemaObject,
  validateStringArray,
  validatePositiveInteger,
  validateISO8601Duration,
  validateOptionalString,
  validate_tool_definition,
} from "./tool-validate.js";
