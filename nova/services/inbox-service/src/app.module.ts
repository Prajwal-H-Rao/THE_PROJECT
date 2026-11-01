/**
 * Root application module for the inbox service.
 * Wires the GmailAdapter, IdempotencyStore, MessageRepository,
 * PG_POOL provider and PollingWorker.
 */

import { Module } from "@nestjs/common";
import { GmailAdapter, createMockGmailAdapter } from "./gmail/gmail-adapter.js";
import { IdempotencyStore } from "./gmail/idempotency.js";
import { MessageRepository } from "./gmail/message-repository.js";
import { PollingWorker } from "./gmail/polling-worker.js";
import { DeltaSyncCursorStore } from "./gmail/delta-sync.js";
import { Pool } from "pg";

const GMAIL_ADAPTER = "GMAIL_ADAPTER";
const PG_POOL = "PG_POOL";

@Module({
  providers: [
    {
      provide: GMAIL_ADAPTER,
      useFactory: () => createMockGmailAdapter({ userId: "system" }),
    },
    {
      provide: IdempotencyStore,
      useClass: IdempotencyStore,
    },
    {
      provide: MessageRepository,
      useClass: MessageRepository,
    },
    {
      provide: DeltaSyncCursorStore,
      useClass: DeltaSyncCursorStore,
    },
    {
      provide: PG_POOL,
      useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }),
    },
    PollingWorker,
  ],
  exports: [GMAIL_ADAPTER, IdempotencyStore, MessageRepository, PG_POOL],
})
export class AppModule {}
