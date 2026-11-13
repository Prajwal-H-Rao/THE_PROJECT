/** Tests for the eval report. The real set is measured; the missing-set path emits no measured claim. */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildReport, resolveSetDir, writeReport } from "./eval-report.js";

test("the real set measures and carries the measured claim", () => {
  const report = buildReport(resolveSetDir());
  assert.equal(report.set_present, true);
  assert.equal(report.cases, 200);
  assert.equal(report.labelled, 200);
  assert.equal(report.metric, "precision_at_50");
  assert.equal(report.measured, true);
  assert.ok(report.ranker !== undefined && report.ranker >= 0 && report.ranker <= 1);
  assert.ok(report.with_rerank !== undefined && report.with_rerank >= 0 && report.with_rerank <= 1);
  assert.ok(report.set_hash !== undefined && /^[0-9a-f]{64}$/.test(report.set_hash));
});

test("a missing set yields a report without a measured claim", () => {
  const absent = join(resolveSetDir(), "does-not-exist");
  const report = buildReport(absent);
  assert.equal(report.set_present, false);
  assert.equal("measured" in report, false);
  assert.equal(report.ranker, undefined);
});

test("the missing-set report writes without a measured key and never touches the real file", () => {
  const absent = join(resolveSetDir(), "does-not-exist");
  const outDir = mkdtempSync(join(tmpdir(), "opencode-eval-"));
  const outPath = join(outDir, "ranking_quality.json");
  writeReport(buildReport(absent), outPath);
  const written = JSON.parse(readFileSync(outPath, "utf8")) as Record<string, unknown>;
  assert.equal(written["set_present"], false);
  assert.equal("measured" in written, false);
});

test("the real report file in the set directory carries the measured claim", () => {
  const text = readFileSync(join(resolveSetDir(), "ranking_quality.json"), "utf8");
  const report = JSON.parse(text) as Record<string, unknown>;
  assert.equal(report["measured"], true);
  assert.equal(report["cases"], 200);
});
