/**
 * Tests for the employer registry CSV importer.
 * Tests valid CSV import, count validation, and header validation failures.
 */

import { test } from "node:test";
import { strictEqual, rejects, ok } from "node:assert";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importCsv } from "./csv-importer.js";

// The valid 11-column header from NOVA_Employer_Targets_500.csv.
const VALID_HEADER: string =
  "target_id,region,company_name,normalized_name,registry_status,user_priority," +
  "career_url,source_mode,ats_provider,source_evidence_url,source_verified_at";

// Build a 500-row valid CSV: 250 IN rows and 250 GLOBAL rows,
// each with a unique normalized_name.
function buildValidCsvContent(): string {
  const lines: string[] = [VALID_HEADER];
  for (let i = 1; i <= 250; i += 1) {
    const id: string = `IN-${String(i).padStart(3, "0")}`;
    const name: string = `company-in-${i}`;
    lines.push(
      `${id},IN,Company IN ${i},${name},needs_verification,3,,,,,`,
    );
  }
  for (let i = 1; i <= 250; i += 1) {
    const id: string = `GLOBAL-${String(i).padStart(3, "0")}`;
    const name: string = `company-global-${i}`;
    lines.push(
      `${id},GLOBAL,Company GLOBAL ${i},${name},needs_verification,3,,,,,`,
    );
  }
  return lines.join("\n") + "\n";
}

// Build a CSV with a given number of rows all in one region.
function buildSingleRegionCsvContent(region: string, rowCount: number): string {
  const lines: string[] = [VALID_HEADER];
  for (let i = 1; i <= rowCount; i += 1) {
    const id: string = `${region}-${String(i).padStart(3, "0")}`;
    const name: string = `company-${region}-${i}`;
    lines.push(
      `${id},${region},Company ${region} ${i},${name},needs_verification,3,,,,,`,
    );
  }
  return lines.join("\n") + "\n";
}

test("imports a valid 500-row CSV (250 IN + 250 GLOBAL)", async () => {
  const dir: string = await mkdtemp(join(tmpdir(), "nova-csv-test-"));
  try {
    const path: string = join(dir, "employers.csv");
    const content: string = buildValidCsvContent();
    await writeFile(path, content, { encoding: "utf8" });
    const rows = await importCsv(path);
    strictEqual(rows.length, 500);
    strictEqual(rows[0]!.target_id, "IN-001");
    strictEqual(rows[249]!.target_id, "IN-250");
    strictEqual(rows[250]!.target_id, "GLOBAL-001");
    strictEqual(rows[499]!.target_id, "GLOBAL-250");
    ok(rows[0]!.career_url === "");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("fails on 499 rows", async () => {
  const dir: string = await mkdtemp(join(tmpdir(), "nova-csv-test-"));
  try {
    const path: string = join(dir, "employers.csv");
    const content: string = buildSingleRegionCsvContent("IN", 499);
    await writeFile(path, content, { encoding: "utf8" });
    await rejects(importCsv(path));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("fails on 501 rows", async () => {
  const dir: string = await mkdtemp(join(tmpdir(), "nova-csv-test-"));
  try {
    const path: string = join(dir, "employers.csv");
    const content: string = buildSingleRegionCsvContent("IN", 501);
    await writeFile(path, content, { encoding: "utf8" });
    await rejects(importCsv(path));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("fails on wrong IN/GLOBAL split", async () => {
  const dir: string = await mkdtemp(join(tmpdir(), "nova-csv-test-"));
  try {
    const path: string = join(dir, "employers.csv");
    // 400 IN + 100 GLOBAL = 500 rows but wrong split
    const inPart: string = buildSingleRegionCsvContent("IN", 400);
    const globalPart: string = buildSingleRegionCsvContent("GLOBAL", 100);
    // Remove headers from the second part, combine
    const globalLines: string[] = globalPart.split("\n").slice(1);
    const content: string = inPart + globalLines.join("\n") + "\n";
    await writeFile(path, content, { encoding: "utf8" });
    await rejects(importCsv(path));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("fails on duplicate normalized_name", async () => {
  const dir: string = await mkdtemp(join(tmpdir(), "nova-csv-test-"));
  try {
    const path: string = join(dir, "employers.csv");
    const lines: string[] = [VALID_HEADER];
    for (let i = 1; i <= 250; i += 1) {
      lines.push(
        `IN-${String(i).padStart(3, "0")},IN,Company ${i},dup-name,needs_verification,3,,,,,`,
      );
    }
    for (let i = 1; i <= 250; i += 1) {
      lines.push(
        `GLOBAL-${String(i).padStart(3, "0")},GLOBAL,Company ${i},dup-name,needs_verification,3,,,,,`,
      );
    }
    const content: string = lines.join("\n") + "\n";
    await writeFile(path, content, { encoding: "utf8" });
    await rejects(importCsv(path));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("fails on a missing column", async () => {
  const dir: string = await mkdtemp(join(tmpdir(), "nova-csv-test-"));
  try {
    const path: string = join(dir, "employers.csv");
    const content: string =
      "target_id,region,company_name,normalized_name,registry_status,user_priority," +
      "career_url,source_mode,ats_provider,source_evidence_url\n" +
      "IN-001,IN,Tata Consultancy Services,tata-consultancy-services," +
      "needs_verification,3,,,,,\n";
    await writeFile(path, content, { encoding: "utf8" });
    await rejects(importCsv(path));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("fails on a renamed column", async () => {
  const dir: string = await mkdtemp(join(tmpdir(), "nova-csv-test-"));
  try {
    const path: string = join(dir, "employers.csv");
    const content: string =
      "target_id,region,company_name,normalized_name,registry_status,user_priority," +
      "career_url,source_mode,ats_provider,source_evidence_url,verified_at\n" +
      "IN-001,IN,Tata Consultancy Services,tata-consultancy-services," +
      "needs_verification,3,,,,,\n";
    await writeFile(path, content, { encoding: "utf8" });
    await rejects(importCsv(path));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
