/**
 * Root application module for the Telegram adapter.
 * Wires the webhook route, offset store and secret token validator.
 */

import { Module } from "@nestjs/common";
import { WebhookRoute } from "./webhook.route.js";
import { OffsetStore } from "./offset-store.js";
import { Validator } from "./validator.js";

const TELEGRAM_SECRET_TOKEN = "TELEGRAM_SECRET_TOKEN";

@Module({
  providers: [
    {
      provide: TELEGRAM_SECRET_TOKEN,
      useValue: process.env.TELEGRAM_SECRET_TOKEN ?? "",
    },
    WebhookRoute,
    OffsetStore,
    Validator,
  ],
  exports: [WebhookRoute, OffsetStore, Validator],
})
export class AppModule {}
