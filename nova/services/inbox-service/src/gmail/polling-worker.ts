/**
 * Polling worker for inbox delta sync.
 * Runs on a setInterval cadence. Chains GmailAdapter.list pages with pageToken.
 * Uses MessageRepository.insertMessage() as the sole authoritative claim gate
 * (INSERT ... ON CONFLICT DO NOTHING). Uses IdempotencyStore as a read-only
 * pre-check cache, updated only after a successful DB insert.
 * Applies exponential backoff on rate-limit errors.
 * Handles partial provider failures: retries on transient errors, re-authenticates
 * on 401 errors, and fails safe by logging errors without crashing.
 */

import { GmailAdapter } from "./gmail-adapter.js";
import { IdempotencyStore } from "./idempotency.js";
import { DeltaCursor } from "./delta-sync.js";
import { DeltaSyncCursorStore } from "./delta-sync.js";
import { computeBackoff, isRateLimited, sleep } from "./backoff.js";

export interface PollingWorkerOptions {
  readonly userId: string;
  readonly pollIntervalMs?: number;
  readonly maxBackoffMs?: number;
  readonly baseBackoffMs?: number;
  readonly pageSize?: number;
}

export interface PollResult {
  readonly processed: number;
  readonly skipped: number;
  readonly pageToken: string | null;
}

interface RepoLike {
  insertMessage: (userId: string, messageId: string) => Promise<boolean>;
}

export class PollingWorker {
  private adapter: GmailAdapter;
  private store: IdempotencyStore;
  private cursorStore: DeltaSyncCursorStore;
  private repository: RepoLike;
  private options: Required<PollingWorkerOptions>;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    adapter: GmailAdapter,
    store: IdempotencyStore,
    cursorStore: DeltaSyncCursorStore,
    repository: RepoLike,
    options: PollingWorkerOptions
  ) {
    this.adapter = adapter;
    this.store = store;
    this.cursorStore = cursorStore;
    this.repository = repository;
    this.options = {
      userId: options.userId,
      pollIntervalMs: options.pollIntervalMs ?? 60000,
      maxBackoffMs: options.maxBackoffMs ?? 60000,
      baseBackoffMs: options.baseBackoffMs ?? 1000,
      pageSize: options.pageSize ?? 50,
    };
  }

  /** Start the polling loop on the configured interval. */
  start(): void {
    if (this.timer !== null) {
      return;
    }
    this.timer = setInterval(() => {
      void this.poll();
    }, this.options.pollIntervalMs);
  }

  /** Stop the polling loop. */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Run one poll cycle: chain pages, claim each message via DB insert,
   * process new messages, save cursor.
   */
  async poll(): Promise<PollResult> {
    if (this.running) {
      return { processed: 0, skipped: 0, pageToken: null };
    }
    this.running = true;
    try {
      return await this.pollCycle();
    } finally {
      this.running = false;
    }
  }

  private async pollCycle(): Promise<PollResult> {
    let processed = 0;
    let skipped = 0;
    let pageToken: string | null = null;

    while (true) {
      const cursor = this.cursorStore.get(this.options.userId);
      const token = pageToken ?? cursor?.lastPageToken ?? null;

      let result;
      try {
        result = await this.adapter.list(
          this.options.userId,
          "",
          this.options.pageSize,
          token ?? undefined
        );
      } catch (error) {
        const err = error as Error;
        // Re-authenticate on 401 Unauthorized and retry once
        if (err.message.includes("401")) {
          try {
            await this.reauthenticate();
            result = await this.adapter.list(
              this.options.userId,
              "",
              this.options.pageSize,
              token ?? undefined
            );
          } catch (reauthError) {
            // Re-authentication failed; fail safe - log and stop this poll cycle
            console.error(
              `Re-authentication failed for user ${this.options.userId}: ${(reauthError as Error).message}`
            );
            return { processed, skipped, pageToken };
          }
        } else if (!isRateLimited(err)) {
          // Non-retryable error: fail safe - log and stop this poll cycle
          console.error(
            `Polling failed for user ${this.options.userId}: ${err.message}`
          );
          return { processed, skipped, pageToken };
        } else {
          // Rate limited: apply exponential backoff and retry
          const delay = computeBackoff(1, {
            baseMs: this.options.baseBackoffMs,
            maxMs: this.options.maxBackoffMs,
          });
          await sleep(delay);
          continue;
        }
      }

      for (const message of result.messages) {
        const key = `gmail:${message.id}`;

        // Read-only pre-check: skip if already seen in this process.
        const seen = await this.store.isProcessed(key);
        if (seen) {
          skipped++;
          continue;
        }

        // Authoritative claim gate: DB INSERT ... ON CONFLICT DO NOTHING.
        const claimed = await this.repository.insertMessage(
          this.options.userId,
          message.id
        );
        if (!claimed) {
          // Another poller or a prior process already claimed this message.
          skipped++;
          continue;
        }

        // Record the durable claim in the in-memory cache for this process.
        await this.store.record(key);
        processed++;
      }

      pageToken = result.nextPageToken;
      if (pageToken === null) {
        break;
      }
    }

    this.cursorStore.set(this.options.userId, {
      userId: this.options.userId,
      lastPageToken: pageToken,
      lastProcessedAt: new Date().toISOString(),
    });

    return { processed, skipped, pageToken: null };
  }

  /**
   * Re-authenticate with the provider to refresh expired credentials.
   * Subclasses should override this with provider-specific auth logic.
   */
  async reauthenticate(): Promise<void> {
    // Default implementation: no-op. Subclasses should override.
  }
}

