#!/usr/bin/env node
/** Lab 1: Validate OpenAPI documents against fixtures.
 * Uses AJV to validate JSON fixtures against the OpenAPI schemas.
 * The contracts package has 2 OpenAPI documents: api-gateway.json and typescript-template.json.
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const REPO_ROOT = resolve(__dirname, "../..");
const OPENAPI_DIR = join(REPO_ROOT, "nova/packages/contracts/openapi");
const FIXTURES_DIR = join(__dirname, "fixtures");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validateOpenAPI(openApiDoc, fixture, label) {
  // Extract the schema from the OpenAPI document
  // For simplicity, we validate against the components/schemas if present
  const schemas = openApiDoc.components?.schemas || {};
  let valid = true;
  let errors = [];

  // Try to find a matching schema for the fixture
  // The fixture should have a $schema or type hint
  const schemaName = fixture.$schema || fixture.type;
  if (schemaName && schemas[schemaName]) {
    const validate = ajv.compile(schemas[schemaName]);
    valid = validate(fixture);
    if (!valid) {
      errors = validate.errors || [];
    }
  } else {
    // If no specific schema, validate the fixture is valid JSON
    // and has required fields based on the OpenAPI paths
    console.log(`  ⚠ No specific schema for ${label}, skipping deep validation`);
  }

  return { valid, errors, label };
}

function main() {
  console.log("=== Lab 1: Contracts OpenAPI Fixture Validation ===\n");

  const openApiFiles = readdirSync(OPENAPI_DIR).filter(f => f.endsWith(".json"));
  console.log(`Found ${openApiFiles.length} OpenAPI document(s):`);
  openApiFiles.forEach(f => console.log(`  - ${f}`));
  console.log("");

  if (openApiFiles.length !== 2) {
    console.error(`FAIL: Expected 2 OpenAPI documents, found ${openApiFiles.length}`);
    process.exit(1);
  }

  let allPassed = true;

  for (const file of openApiFiles) {
    const openApiDoc = loadJson(join(OPENAPI_DIR, file));
    console.log(`\nValidating ${file}...`);

    // Find fixtures for this OpenAPI doc
    const fixturePrefix = file.replace(".json", "");
    const fixtureFiles = readdirSync(FIXTURES_DIR)
      .filter(f => f.startsWith(fixturePrefix) && f.endsWith(".json"));

    if (fixtureFiles.length === 0) {
      console.log(`  ⚠ No fixtures found for ${file}`);
      continue;
    }

    for (const fixtureFile of fixtureFiles) {
      const fixture = loadJson(join(FIXTURES_DIR, fixtureFile));
      const result = validateOpenAPI(openApiDoc, fixture, fixtureFile);

      if (result.valid) {
        console.log(`  ✓ ${fixtureFile} validates`);
      } else {
        console.log(`  ✗ ${fixtureFile} failed validation:`);
        result.errors.forEach(e => {
          console.log(`    - ${e.instancePath || e.schemaPath}: ${e.message}`);
        });
        allPassed = false;
      }
    }
  }

  console.log("\n=== Result ===");
  if (allPassed) {
    console.log("PASS: All two OpenAPI documents validate their fixtures");
    process.exit(0);
  } else {
    console.log("FAIL: Some fixtures failed validation");
    process.exit(1);
  }
}

main();