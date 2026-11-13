/** The CLI entry for the ranking evaluation. Run with `npm run score` after a build. */

import { join } from "node:path";
import { buildReport, resolveSetDir, writeReport } from "./eval-report.js";

/** Run the report build and write ranking_quality.json into the set directory. */
function main(): void {
  const setDir = resolveSetDir();
  const report = buildReport(setDir);
  const outPath = join(setDir, "ranking_quality.json");
  writeReport(report, outPath);
  if (report.measured === true) {
    console.log(`measured precision@50: ranker ${report.ranker}, with rerank ${report.with_rerank}`);
  } else {
    console.log("set missing: report written without a measured claim");
  }
}

main();
