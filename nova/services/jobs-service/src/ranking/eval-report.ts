/**
 * The ranking evaluation report. It joins the labelled set, scores every case
 * with the ranker, and writes ranking_quality.json. A missing set yields a
 * report without a measured claim, per the acceptance test.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { scoreListing } from "./score.js";
import { rerank, tokenCosine } from "./rerank.js";
import type { RankedCandidate, RankedListing, ScoredListing } from "./ranked-types.js";

/** One labelled case: the candidate and the listing, joined later to its label. */
export interface EvalCase {
  readonly case_id: string;
  readonly candidate: RankedCandidate;
  readonly listing: RankedListing;
}

/** One human label for one case. */
export interface EvalLabel {
  readonly case_id: string;
  readonly label: "relevant" | "not_relevant";
  readonly note: string;
}

/** The report shape. The measured key exists only when the set was scored. */
export interface RankingQualityReport {
  readonly set_present: boolean;
  readonly cases?: number;
  readonly labelled?: number;
  readonly relevant?: number;
  readonly metric?: string;
  readonly ranker?: number;
  readonly with_rerank?: number;
  readonly measured?: true;
  readonly set_hash?: string;
}

/** Resolve the eval set directory from this module's compiled location. */
export function resolveSetDir(): string {
  return fileURLToPath(new URL("../../../../tests/job-eval", import.meta.url));
}

/** Parse one JSONL file into records. Throws on a malformed line. */
function readJsonl(path: string): Record<string, unknown>[] {
  const text = readFileSync(path, "utf8");
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

/** Load and join the set. Dangling rows are errors, and the set must hold 200 cases. */
export function loadSet(dir: string): { cases: EvalCase[]; labels: Map<string, EvalLabel>; setHash: string } {
  const caseRecords = readJsonl(`${dir}/cases.jsonl`);
  const labelRecords = readJsonl(`${dir}/labels.jsonl`);
  const cases = caseRecords.map((record) => record as unknown as EvalCase);
  const labels = new Map<string, EvalLabel>();
  for (const record of labelRecords) {
    const label = record as unknown as EvalLabel;
    labels.set(label.case_id, label);
  }
  const danglingLabels = [...labels.keys()].filter((id) => !caseRecords.some((c) => c["case_id"] === id));
  if (danglingLabels.length > 0) {
    throw new Error(`labels without cases: ${danglingLabels.slice(0, 3).join(", ")}`);
  }
  const unlabelled = cases.filter((entry) => !labels.has(entry.case_id));
  if (unlabelled.length > 0) {
    throw new Error(`cases without labels: ${unlabelled.slice(0, 3).map((c) => c.case_id).join(", ")}`);
  }
  if (cases.length !== 200) {
    throw new Error(`the set must hold 200 cases, found ${cases.length}`);
  }
  const setHash = createHash("sha256").update(readFileSync(`${dir}/cases.jsonl`)).update(readFileSync(`${dir}/labels.jsonl`)).digest("hex");
  return { cases, labels, setHash };
}

/** Return the share of relevant cases in the top k of the given order. */
function precisionAtK(order: readonly ScoredListing[], labels: Map<string, EvalLabel>, k: number): number {
  const top = order.slice(0, k);
  const relevant = top.filter((entry) => labels.get(entry.listing_id)?.label === "relevant").length;
  return relevant / k;
}

/** Score every case, then measure precision@50 with and without the rerank. */
export function measureSet(cases: readonly EvalCase[], labels: Map<string, EvalLabel>): {
  ranker: number;
  withRerank: number;
  relevant: number;
} {
  const scored = cases.map((entry) => scoreListing(entry.candidate, entry.listing));
  scored.sort((a, b) => b.score - a.score || a.listing_id.localeCompare(b.listing_id));
  const similarityOf = (listingId: string): number => {
    const entry = cases.find((c) => c.listing.listing_id === listingId);
    if (entry === undefined) {
      return 0;
    }
    return tokenCosine([...entry.candidate.skills], [...entry.listing.skills]);
  };
  const reranked = rerank(scored, similarityOf);
  const relevant = cases.filter((entry) => labels.get(entry.case_id)?.label === "relevant").length;
  return {
    ranker: precisionAtK(scored, labels, 50),
    withRerank: precisionAtK(reranked, labels, 50),
    relevant,
  };
}

/** Build the report. A missing set yields a report with no measured claim. */
export function buildReport(dir: string): RankingQualityReport {
  if (!existsSync(`${dir}/cases.jsonl`) || !existsSync(`${dir}/labels.jsonl`)) {
    return { set_present: false };
  }
  const { cases, labels, setHash } = loadSet(dir);
  const measurement = measureSet(cases, labels);
  return {
    set_present: true,
    cases: cases.length,
    labelled: labels.size,
    relevant: measurement.relevant,
    metric: "precision_at_50",
    ranker: measurement.ranker,
    with_rerank: measurement.withRerank,
    measured: true,
    set_hash: setHash,
  };
}

/** Write the report as deterministic JSON. The construction order is fixed, so the bytes stay stable. */
export function writeReport(report: RankingQualityReport, outPath: string): void {
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
