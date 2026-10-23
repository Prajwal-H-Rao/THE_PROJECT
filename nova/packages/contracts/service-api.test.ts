/** The tests of the service API contract. A removal or a drift is a rejection. */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { breakingChanges, buildDocument, readDocument } from "./service-api.js";
import { GATEWAY_ENDPOINTS, TEMPLATE_ENDPOINTS } from "./service-api.js";

function gatewayDoc() {
  return buildDocument("nova-api-gateway", GATEWAY_ENDPOINTS);
}

function templateDoc() {
  return buildDocument("nova-ts-template", TEMPLATE_ENDPOINTS);
}

test("the gateway document holds its pinned version and its routes", async () => {
  const doc = gatewayDoc();
  assert.equal(doc.openapi, "3.1.0");
  assert.equal(doc.info.version, "1.0.0");
  assert.ok(doc.paths["/v1/health/live"] !== undefined);
  assert.ok(Object.keys(doc.paths).includes("/v1/internal"));
});

test("the template document holds its health routes", () => {
  const doc = templateDoc();
  assert.equal(Object.keys(doc.paths).length, 2);
  assert.ok(doc.paths["/v1/health/ready"] !== undefined);
});

test("a committed document matches a fresh build byte for byte", async () => {
  // WHY: the committed JSON is the record. A schema change must rewrite the record
  // deliberately, so the test compares the bytes instead of the parsed shape.
  const baseline = await readFile(
    fileURLToPath(new URL("../openapi/api-gateway.json", import.meta.url)),
    "utf8",
  );
  assert.equal(JSON.stringify(gatewayDoc(), null, 2) + "\n", baseline);
});

test("a committed template document matches a fresh build", async () => {
  const baseline = await readFile(
    fileURLToPath(new URL("../openapi/typescript-template.json", import.meta.url)),
    "utf8",
  );
  assert.equal(JSON.stringify(templateDoc(), null, 2) + "\n", baseline);
});

test("a removed path is a breaking change", () => {
  const baseline = gatewayDoc();
  const current = buildDocument("nova-api-gateway", GATEWAY_ENDPOINTS.slice(1));
  assert.deepEqual(breakingChanges(readDocument(baseline) as any, readDocument(current) as any), [
    "removed path /v1/health/live",
  ]);
});

test("a healthy document names no breaking change", () => {
  const doc = readDocument(gatewayDoc()) as any;
  assert.deepEqual(breakingChanges(doc, doc), []);
});

test("a malformed document reads as null", () => {
  assert.equal(readDocument("nope"), null);
  assert.equal(readDocument({ info: null, paths: {} }), null);
});
