/**
 * Scheduled poll scheduler (task 13.16, spec:581).
 * Polls verified public sources once per 24 hours by default, with jitter,
 * concurrency cap, and ETag/Last-Modified cache validators.
 * Calls guardPoll from poll-gate (task 6) so unverified sources are never polled.
 * Pure TypeScript + pg Pool: no model, no live network in the scheduling logic.
 */

import { Pool } from "pg";
import { guardPoll } from "../poll-gate.js";

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface Source {
  readonly source_id: string;
  readonly state: string;
  readonly last_poll_at: string | null;
  readonly next_check_at: string | null;
  readonly interval_ms: number;
  readonly etag: string | null;
  readonly last_modified: string | null;
}

export interface PollDecision {
  readonly source_id: string;
  readonly poll: boolean;
  readonly reason: string;
  readonly headers: Record<string, string>;
}

/** Add jitter to the interval: +/- 10%. */
function jitter(intervalMs: number): number {
  const delta = Math.floor(intervalMs * 0.1);
  const j = Math.floor(Math.random() * (2 * delta + 1)) - delta;
  return intervalMs + j;
}

/** Return true when the source is due for polling. */
function isDue(source: Source, now: string): boolean {
  if (source.next_check_at === null) {
    return true;
  }
  return Date.parse(now) >= Date.parse(source.next_check_at);
}

/** Build the conditional-request headers from ETag and Last-Modified. */
function conditionalHeaders(source: Source): Record<string, string> {
  const headers: Record<string, string> = {};
  if (source.etag !== null) {
    headers["If-None-Match"] = source.etag;
  }
  if (source.last_modified !== null) {
    headers["If-Modified-Since"] = source.last_modified;
  }
  return headers;
}

/** Decide whether to poll one source. guardPoll enforces verified_permitted. */
function decidePoll(source: Source, now: string): PollDecision {
  try {
    guardPoll(source.state);
  } catch {
    return {
      source_id: source.source_id,
      poll: false,
      reason: "not_verified_permitted",
      headers: {},
    };
  }
  if (!isDue(source, now)) {
    return {
      source_id: source.source_id,
      poll: false,
      reason: "not_due",
      headers: conditionalHeaders(source),
    };
  }
  return {
    source_id: source.source_id,
    poll: true,
    reason: "due",
    headers: conditionalHeaders(source),
  };
}

/** Compute the next check time: now + jittered interval. */
function nextCheckTime(now: string, intervalMs: number): string {
  return new Date(Date.parse(now) + jitter(intervalMs)).toISOString();
}

/**
 * Decide polling for a batch of sources. Concurrency cap limits how many
 * are selected for polling in one cycle.
 */
export function decideBatch(
  sources: readonly Source[],
  now: string,
  concurrencyCap: number,
): { decisions: PollDecision[]; nextCheckAt: string } {
  const decisions: PollDecision[] = [];
  let polled = 0;
  for (const source of sources) {
    const decision = decidePoll(source, now);
    if (decision.poll && polled >= concurrencyCap) {
      decisions.push({
        source_id: source.source_id,
        poll: false,
        reason: "concurrency_cap",
        headers: {},
      });
    } else if (decision.poll) {
      polled += 1;
      decisions.push(decision);
    } else {
      decisions.push(decision);
    }
  }
  const nextCheckAt = nextCheckTime(now, DEFAULT_INTERVAL_MS);
  return { decisions, nextCheckAt };
}

/** Load sources from the DB. Thin wrapper over pg Pool. */
export async function loadSources(pool: Pool): Promise<Source[]> {
  const result = await pool.query(
    `SELECT source_id, state, last_poll_at, next_check_at, interval_ms, etag, last_modified
     FROM employer_registry_service.employer_job_sources`
  );
  return result.rows.map((row) => ({
    source_id: row["source_id"] as string,
    state: row["state"] as string,
    last_poll_at: (row["last_poll_at"] as string | null) ?? null,
    next_check_at: (row["next_check_at"] as string | null) ?? null,
    interval_ms: (row["interval_ms"] as number | null) ?? DEFAULT_INTERVAL_MS,
    etag: (row["etag"] as string | null) ?? null,
    last_modified: (row["last_modified"] as string | null) ?? null,
  }));
}

export { DEFAULT_INTERVAL_MS, decidePoll, isDue, conditionalHeaders, nextCheckTime };
