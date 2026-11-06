/**
 * Count validation for employer registry CSV imports.
 * Enforces exactly 500 rows: 250 IN plus 250 GLOBAL, unique normalized_name.
 */

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

// The required number of seed rows.
const REQUIRED_ROW_COUNT: number = 500;

// The required number of rows per region.
const REQUIRED_REGION_COUNT: number = 250;

/**
 * Validate that parsed CSV rows meet the employer registry import rules.
 * Exactly 500 rows: 250 IN plus 250 GLOBAL, unique normalized_name.
 * Throws on any violation.
 */
function validateCounts(rows: EmployerCsvRow[]): void {
  if (rows.length !== REQUIRED_ROW_COUNT) {
    throw new Error(
      `Invalid row count: expected ${REQUIRED_ROW_COUNT}, found ${rows.length}`,
    );
  }

  let inCount = 0;
  let globalCount = 0;
  const seenNames: Set<string> = new Set();

  for (let i = 0; i < rows.length; i += 1) {
    const row: EmployerCsvRow = rows[i];
    if (row.region === "IN") {
      inCount += 1;
    } else if (row.region === "GLOBAL") {
      globalCount += 1;
    }
    if (seenNames.has(row.normalized_name)) {
      throw new Error(
        `Duplicate normalized_name at row ${i + 1}: "${row.normalized_name}"`,
      );
    }
    seenNames.add(row.normalized_name);
  }

  if (inCount !== REQUIRED_REGION_COUNT) {
    throw new Error(
      `Invalid IN region count: expected ${REQUIRED_REGION_COUNT}, found ${inCount}`,
    );
  }
  if (globalCount !== REQUIRED_REGION_COUNT) {
    throw new Error(
      `Invalid GLOBAL region count: expected ${REQUIRED_REGION_COUNT}, found ${globalCount}`,
    );
  }
}

export { validateCounts };
