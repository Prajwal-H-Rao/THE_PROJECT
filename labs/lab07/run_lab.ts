// Nova Lab 7 — Job search in permitted mode on a labelled set
// Owning module: 13-employer-registry (phase P8). Reads a labelled ranking set
// and renders a ranking report. No network calls; uses fixtures only.

import { readFileSync } from "fs";
import { join } from "path";

interface LabelledCase {
  case_id: string;
  label: "relevant" | "not_relevant";
  board: string;
  note: string;
}

function loadLabels(): LabelledCase[] {
  const text = readFileSync(join(__dirname, "..", "labels.jsonl"), "utf8");
  return text
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as LabelledCase);
}

function renderReport(cases: LabelledCase[]): void {
  let relevant = 0;
  let notRelevant = 0;
  const byBoard: Record<string, number> = {};
  for (const c of cases) {
    if (c.label === "relevant") {
      relevant += 1;
    } else {
      notRelevant += 1;
    }
    byBoard[c.board] = (byBoard[c.board] ?? 0) + 1;
  }
  console.log("Lab 7 — Job search in permitted mode on a labelled set");
  console.log(`Total cases: ${cases.length}`);
  console.log(`Relevant: ${relevant}`);
  console.log(`Not relevant: ${notRelevant}`);
  console.log("Cases per board:");
  for (const [board, count] of Object.entries(byBoard).sort(([, a], [, b]) => b - a)) {
    console.log(`  ${board}: ${count}`);
  }
}

function main(): void {
  const cases = loadLabels();
  renderReport(cases);
}

main();
