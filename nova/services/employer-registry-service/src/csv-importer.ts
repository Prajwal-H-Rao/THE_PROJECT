/**
 * CSV importer for the employer registry seed file.
 * Reads NOVA_Employer_Targets_500.csv from the repository root.
 * Validates the 11-column header. Fails on missing or renamed columns.
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCounts } from "./validate.js";

// The expected 11-column header, in order.
const EXPECTED_HEADER: readonly string[] = [
  "target_id",
  "region",
  "company_name",
  "normalized_name",
  "registry_status",
  "user_priority",
  "career_url",
  "source_mode",
  "ats_provider",
  "source_evidence_url",
  "source_verified_at",
];

// One row of the employer seed CSV.
interface EmployerCsvRow {
  target_id: string;
  region: string;
  company_name: string;
  normalized_name: string;
  registry_status: string;
  user_priority: string;
  career_url: string;
  source_mode: string;
  ats_provider: string;
  source_evidence_url: string;
  source_verified_at: string;
}

// The directory that holds this module, resolved from import.meta.url.
// NodeNext ESM has no bare __dirname; we resolve from import.meta.url instead.
const MODULE_DIR: string = dirname(fileURLToPath(import.meta.url));

// The default path to the seed CSV, four levels up from dist/ to the repo root.
const DEFAULT_CSV_PATH: string = resolve(MODULE_DIR, "../../../../NOVA_Employer_Targets_500.csv");

/**
 * Parse a CSV string into rows of fields.
 * Handles quoted fields, embedded commas, embedded newlines, escaped quotes,
 * and a leading UTF-8 BOM.
 */
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  // Strip a leading UTF-8 BOM if present.
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  while (i < content.length) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ",") {
      fields.push(current);
      current = "";
      i += 1;
      continue;
    }

    if (ch === "\n") {
      fields.push(current);
      rows.push(fields);
      fields = [];
      current = "";
      i += 1;
      continue;
    }

    if (ch === "\r") {
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  // Push the last field and row if the file has content.
  if (current.length > 0 || fields.length > 0) {
    fields.push(current);
    rows.push(fields);
  }

  return rows;
}

/**
 * Validate that a header row matches the expected 11 columns exactly.
 * Throws on missing, renamed, or extra columns.
 */
function validateHeader(fields: string[]): void {
  if (fields.length !== EXPECTED_HEADER.length) {
    throw new Error(
      `Invalid header: expected ${EXPECTED_HEADER.length} columns, found ${fields.length}`,
    );
  }
  for (let j = 0; j < EXPECTED_HEADER.length; j += 1) {
    if (fields[j] !== EXPECTED_HEADER[j]) {
      throw new Error(
        `Invalid header column at position ${j}: expected "${EXPECTED_HEADER[j]}", found "${fields[j]}"`,
      );
    }
  }
}

/**
 * Import employer seed data from a CSV file.
 * Validates the header before parsing rows.
 * Returns the parsed rows.
 * Fails when the header does not match the expected 11 columns.
 */
async function importCsv(csvPath: string = DEFAULT_CSV_PATH): Promise<EmployerCsvRow[]> {
  const content: string = await readFile(csvPath, { encoding: "utf8" });
  const rows: string[][] = parseCsv(content);

  if (rows.length === 0) {
    throw new Error("Invalid header: CSV file is empty");
  }

  validateHeader(rows[0]);

  const result: EmployerCsvRow[] = [];
  for (let r = 1; r < rows.length; r += 1) {
    const fields: string[] = rows[r];
    const row: EmployerCsvRow = {
      target_id: fields[0] ?? "",
      region: fields[1] ?? "",
      company_name: fields[2] ?? "",
      normalized_name: fields[3] ?? "",
      registry_status: fields[4] ?? "",
      user_priority: fields[5] ?? "",
      career_url: fields[6] ?? "",
      source_mode: fields[7] ?? "",
      ats_provider: fields[8] ?? "",
      source_evidence_url: fields[9] ?? "",
      source_verified_at: fields[10] ?? "",
    };
    result.push(row);
  }

  validateCounts(result);

  return result;
}

export { importCsv, DEFAULT_CSV_PATH, EmployerCsvRow, validateCounts };
