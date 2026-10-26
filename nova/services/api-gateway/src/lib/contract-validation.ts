/** The contract validator of the gateway. No imports: the Next build (Turbopack)
 * and the plain node test build resolve relative modules differently. */

/** A JSON Schema subset that the gateway understands. */
export interface JsonSchema {
  readonly type: string;
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly additionalProperties?: boolean;
  readonly required?: readonly string[];
  readonly items?: JsonSchema;
  readonly enum?: readonly unknown[];
  readonly format?: string;
  readonly minLength?: number; readonly maxLength?: number;
  readonly minimum?: number; readonly maximum?: number;
}

/** Predefined schemas for the API paths that accept a body. */
export const SCHEMAS: Readonly<Record<string, JsonSchema>> = {
  // Service echo: one bounded message, no extra fields.
  "internal/echo": {
    type: "object", additionalProperties: false, required: ["message"],
    properties: { message: { type: "string", minLength: 1, maxLength: 1000 } },
  },
  // Task creation.
  "tasks/create": {
    type: "object", additionalProperties: false, required: ["title"],
    properties: {
      title: { type: "string", minLength: 1, maxLength: 200 },
      description: { type: "string", maxLength: 5000 },
      dueDate: { type: "string", format: "date-time" },
      priority: { type: "string", enum: ["low", "medium", "high"] },
    },
  },
  // Job application.
  "jobs/apply": {
    type: "object", additionalProperties: false, required: ["jobId", "coverLetter"],
    properties: {
      jobId: { type: "string", minLength: 1 },
      coverLetter: { type: "string", maxLength: 10000 },
      resumeId: { type: "string" },
    },
  },
  // Integrations linking.
  "integrations/link": {
    type: "object", additionalProperties: false, required: ["provider", "externalId"],
    properties: {
      provider: { type: "string", enum: ["telegram", "whatsapp", "email"] },
      externalId: { type: "string", minLength: 1 },
      displayName: { type: "string", maxLength: 100 },
    },
  },
  // Finance import. The payload can be large, so size checks live in the body limit.
  "finance/import": {
    type: "object", additionalProperties: false, required: ["source", "data"],
    properties: {
      source: { type: "string", enum: ["csv", "ofx", "qif", "json"] },
      data: { type: "string", minLength: 1 },
      accountId: { type: "string" },
    },
  },
};

/** The API paths that carry a contract. Exact match on the normalized path. */
const PATH_TO_SCHEMA: Readonly<Record<string, string>> = {
  "/api/internal/echo": "internal/echo",
  "/api/v1/tasks": "tasks/create", "/api/v1/jobs/apply": "jobs/apply",
  "/api/v1/integrations/link": "integrations/link", "/api/v1/finance/import": "finance/import",
};

/** Result of one validation run. */
export type ValidationResult = { readonly ok: true } | { readonly ok: false; readonly errors: readonly string[] };

/** The method names whose requests carry a body contract. */
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

/** Decode percent-encoded paths so /api/v1/%74asks cannot skip validation. */
function normalizePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    // WHY: a malformed sequence must not throw into the caller. The raw path
    // then misses the map, which stays fail-open for unknown paths only.
    return pathname;
  }
}

/** Validate one value against one schema and collect every error. */
export function validateAgainstSchema(value: unknown, schema: JsonSchema, path = "$"): ValidationResult {
  const errors: string[] = [];
  if (schema.type === "object") {
    checkObject(value, schema, path, errors);
  } else if (schema.type === "string") {
    checkString(value, schema, path, errors);
  } else if (schema.type === "number" || schema.type === "integer") {
    checkNumber(value, schema, path, errors);
  } else if (schema.type === "array") {
    checkArray(value, schema, path, errors);
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/** Check an object value: required fields, known properties, nested schemas. */
function checkObject(value: unknown, schema: JsonSchema, path: string, errors: string[]): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.push(`${path}: expected object`);
    return;
  }
  const obj = value as Record<string, unknown>;
  for (const req of schema.required ?? []) {
    if (!(req in obj)) errors.push(`${path}.${req}: required field missing`);
  }
  for (const [key, val] of Object.entries(obj)) {
    // WHY: with additionalProperties false, a missing property schema means the client sent an undefined field.
    const propSchema: JsonSchema | undefined = schema.properties?.[key];
    if (propSchema !== undefined) {
      const result = validateAgainstSchema(val, propSchema, `${path}.${key}`);
      if (!result.ok) errors.push(...result.errors);
    } else if (schema.additionalProperties === false) {
      errors.push(`${path}.${key}: unexpected property`);
    }
  }
}

/** Check a string value: length, enum, date-time format. */
function checkString(value: unknown, schema: JsonSchema, path: string, errors: string[]): void {
  if (typeof value !== "string") {
    errors.push(`${path}: expected string`);
    return;
  }
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push(`${path}: string too short (min ${schema.minLength})`);
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    errors.push(`${path}: string too long (max ${schema.maxLength})`);
  }
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push(`${path}: value not in allowed enum`);
  }
  if (schema.format === "date-time" && Number.isNaN(new Date(value).getTime())) {
    errors.push(`${path}: invalid date-time format`);
  }
}

/** Check a number value: finiteness, integer form, minimum and maximum. */
function checkNumber(value: unknown, schema: JsonSchema, path: string, errors: string[]): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${path}: expected number`);
    return;
  }
  if (schema.type === "integer" && !Number.isInteger(value)) {
    errors.push(`${path}: expected integer`);
  }
  if (schema.minimum !== undefined && value < schema.minimum) {
    errors.push(`${path}: value below minimum ${schema.minimum}`);
  }
  if (schema.maximum !== undefined && value > schema.maximum) {
    errors.push(`${path}: value above maximum ${schema.maximum}`);
  }
}

/** Check an array value with one element schema. */
function checkArray(value: unknown, schema: JsonSchema, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path}: expected array`);
    return;
  }
  if (schema.items === undefined) return;
  const items = schema.items;
  // WHY: the guard above holds a non-undefined element schema for every item.
  value.forEach((item, index) => {
    const result = validateAgainstSchema(item, items, `${path}[${index}]`);
    if (!result.ok) errors.push(...result.errors);
  });
}

/** Build the 400 answer. The shape matches the ErrorBody of the responses lib. */
function errorAnswer(traceId: string, code: string, details?: string): Response {
  const body = { error: code, trace_id: traceId, ...(details !== undefined ? { details } : {}) };
  return Response.json(body, { status: 400 });
}

/** Validate one request body. Returns the 400 answer, or null when the call passes. */
export function validateContract(pathname: string, method: string, bodyText: string, traceId: string): Response | null {
  if (!BODY_METHODS.has(method.toUpperCase())) return null; // GET and DELETE carry no contract.
  const key: string | undefined = PATH_TO_SCHEMA[normalizePath(pathname)];
  // WHY: an unknown path carries no contract, so the handler keeps its own behavior.
  if (key === undefined || SCHEMAS[key] === undefined) return null;
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return errorAnswer(traceId, "invalid_json");
  }
  const result = validateAgainstSchema(body, SCHEMAS[key]);
  if (!result.ok) {
    return errorAnswer(traceId, "validation_failed", result.errors.join("; "));
  }
  return null;
}
