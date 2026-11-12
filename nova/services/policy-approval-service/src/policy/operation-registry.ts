/**
 * Nova design system - Operation registry (task 11.18, module 11).
 * Registers trips operations with the policy layer: argument schema,
 * resource scope, risk tier, quota and verifier (spec:195).
 * Validates call arguments against registered schemas and rejects
 * unregistered arguments.
 */

export interface ArgumentSchema {
  readonly type: string;
  readonly properties: Record<string, { readonly type: string }>;
  readonly required: readonly string[];
}

export interface OperationRegistration {
  readonly operationId: string;
  readonly argumentSchema: ArgumentSchema;
  readonly resourceScope: string;
  readonly riskTier: string;
  readonly quota: string;
  readonly verifier: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

export class OperationRegistry {
  private readonly operations = new Map<string, OperationRegistration>();

  registerOperation(registration: OperationRegistration): void {
    this.operations.set(registration.operationId, registration);
  }

  getOperation(operationId: string): OperationRegistration | undefined {
    return this.operations.get(operationId);
  }

  isRegistered(operationId: string): boolean {
    return this.operations.has(operationId);
  }

  validateArguments(
    operationId: string,
    args: Record<string, unknown> | undefined,
  ): ValidationResult {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return { valid: false, reason: `Operation ${operationId} is not registered` };
    }

    const schema = operation.argumentSchema;
    const propertyNames = new Set(Object.keys(schema.properties));
    const provided = args ?? {};

    for (const key of Object.keys(provided)) {
      if (!propertyNames.has(key)) {
        return {
          valid: false,
          reason: `Unregistered argument '${key}' for operation ${operationId}`,
        };
      }
    }

    for (const required of schema.required) {
      if (!(required in provided)) {
        return {
          valid: false,
          reason: `Missing required argument '${required}' for operation ${operationId}`,
        };
      }
    }

    return { valid: true };
  }
}

export function registerTripsOperations(registry: OperationRegistry): void {
  registry.registerOperation({
    operationId: "trips.read",
    argumentSchema: {
      type: "object",
      properties: { origin: { type: "string" }, destination: { type: "string" } },
      required: ["origin", "destination"],
    },
    resourceScope: "own_trips",
    riskTier: "tier1",
    quota: "100/d",
    verifier: "verify_trips_read",
  });

  registry.registerOperation({
    operationId: "trips.write",
    argumentSchema: {
      type: "object",
      properties: { name: { type: "string" }, origin: { type: "string" }, destination: { type: "string" } },
      required: ["name", "origin", "destination"],
    },
    resourceScope: "own_trips",
    riskTier: "tier2",
    quota: "50/d",
    verifier: "verify_trips_write",
  });

  registry.registerOperation({
    operationId: "trips.compare",
    argumentSchema: {
      type: "object",
      properties: { origin: { type: "string" }, destination: { type: "string" } },
      required: ["origin", "destination"],
    },
    resourceScope: "external_provider",
    riskTier: "tier1",
    quota: "100/d",
    verifier: "verify_trips_compare",
  });

  registry.registerOperation({
    operationId: "trips.book",
    argumentSchema: {
      type: "object",
      properties: {
        trip_id: { type: "string" },
        origin: { type: "string" },
        destination: { type: "string" },
        travel_date: { type: "string" },
        fare_minor: { type: "integer" },
      },
      required: ["trip_id", "origin", "destination", "travel_date", "fare_minor"],
    },
    resourceScope: "own_trips",
    riskTier: "tier3",
    quota: "10/d",
    verifier: "verify_trips_book",
  });
}

export const defaultRegistry = new OperationRegistry();
registerTripsOperations(defaultRegistry);
