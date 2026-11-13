/**
 * Root application module for the WhatsApp adapter.
 * Wires the webhook route, signature verifier, dedup store,
 * replay guard and outbound sender with PG pool.
 */

import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { WebhookRoute } from "./webhook.route.js";
import { SignatureValidator } from "./signature.js";
import { DedupStore } from "./dedup.js";
import { ReplayGuard } from "./replay.js";
import { OutboundSender } from "./outbound.js";

const WHATSAPP_APP_SECRET = "WHATSAPP_APP_SECRET";
const PG_POOL = "PG_POOL";

@Module({
  providers: [
    {
      provide: WHATSAPP_APP_SECRET,
      useValue: process.env.WHATSAPP_APP_SECRET ?? "",
    },
    {
      provide: PG_POOL,
      useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL }),
    },
    WebhookRoute,
    SignatureValidator,
    DedupStore,
    ReplayGuard,
    OutboundSender,
  ],
  exports: [WebhookRoute, SignatureValidator, DedupStore, ReplayGuard, OutboundSender, PG_POOL],
})
export class AppModule {}
