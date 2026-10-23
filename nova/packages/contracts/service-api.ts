/** The versioned service API contract. Deterministic builders write the pinned docs. */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The OpenAPI version the documents pin. */
export const OPENAPI_VERSION = "3.1.0";

/** The service API version the documents pin. */
export const API_VERSION = "1.0.0";

/** One documented endpoint of one service. */
export interface Endpoint {
  readonly method: "get" | "post" | "put" | "delete";
  readonly path: string;
  readonly response: Record<string, unknown>;
}

/** One document of one service, in API-contract shape. */
export interface ServiceDocument {
  readonly openapi: string;
  readonly info: { readonly title: string; readonly version: string };
  readonly paths: Record<string, Record<string, unknown>>;
}

/** The routes of the gateway the documents pin. */
export const GATEWAY_ENDPOINTS: readonly Endpoint[] = [
  { method: "get", path: "/v1/health/live", response: { status: "live" } },
  { method: "get", path: "/v1/health/ready", response: { status: "ready" } },
  {
    method: "get",
    path: "/v1/internal",
    response: { ok: true, service: "string", scope: "string", trace_id: "string" },
  },
];

/** The routes of the TypeScript template service. */
export const TEMPLATE_ENDPOINTS: readonly Endpoint[] = [
  { method: "get", path: "/v1/health/live", response: { status: "live" } },
  { method: "get", path: "/v1/health/ready", response: { status: "ready" } },
];

/** Build one service document. The key order is fixed, so the bytes stay stable. */
export function buildDocument(title: string, endpoints: readonly Endpoint[]): ServiceDocument {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const endpoint of endpoints) {
    const pathItem = paths[endpoint.path] ?? {};
    pathItem[endpoint.method] = {
      responses: {
        "200": { description: "The fixed answer of this endpoint.", json: endpoint.response },
      },
    };
    paths[endpoint.path] = pathItem;
  }
  return { openapi: OPENAPI_VERSION, info: { title, version: API_VERSION }, paths };
}

/** Read one document back. A malformed document returns null. */
export function readDocument(input: unknown): ServiceDocument | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const info = record["info"];
  if (typeof info !== "object" || info === null) {
    return null;
  }
  const paths = record["paths"];
  if (typeof paths !== "object" || paths === null) {
    return null;
  }
  return {
    openapi: record["openapi"] as string,
    info: info as ServiceDocument["info"],
    paths: paths as ServiceDocument["paths"],
  };
}

/** Return the list of paths that one version removed from the other. The diff is shallow. */
export function breakingChanges(baseline: ServiceDocument, current: ServiceDocument): string[] {
  const problems: string[] = [];
  for (const pathKey of Object.keys(baseline.paths)) {
    if (current.paths[pathKey] === undefined) {
      problems.push("removed path " + pathKey);
    }
  }
  return problems;
}

/** Write one document to the committed openapi folder. The bytes are the record. */
export async function writeDocument(fileName: string, doc: ServiceDocument): Promise<void> {
  const folder = path.resolve(fileURLToPath(new URL("../openapi/", import.meta.url)));
  await writeFile(path.join(folder, fileName), JSON.stringify(doc, null, 2) + "\n", "utf8");
}
