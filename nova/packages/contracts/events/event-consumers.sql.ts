/** SQL implementation of AsyncReceiptsStore using jobs_service.event_receipts. */

import { Pool } from "pg";
import { AsyncReceiptsStore } from "./event-consumers.js";

export class SqlReceiptsStore implements AsyncReceiptsStore {
  constructor(private readonly pool: Pool) {}

  /** Return true when the store already holds one event id. */
  async hold(eventId: string): Promise<boolean> {
    const result = await this.pool.query(
      "SELECT 1 FROM jobs_service.event_receipts WHERE event_id = $1",
      [eventId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Add one event id. */
  async record(eventId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO jobs_service.event_receipts (event_id, received_at)
       VALUES ($1, NOW())
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId]
    );
  }

  /** Atomic check-and-record for exactly-once delivery. */
  async holdAndRecord(eventId: string): Promise<"processed" | "duplicate"> {
    const result = await this.pool.query(
      `INSERT INTO jobs_service.event_receipts (event_id, received_at)
       VALUES ($1, NOW())
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [eventId]
    );
    return (result.rowCount ?? 0) > 0 ? "processed" : "duplicate";
  }
}