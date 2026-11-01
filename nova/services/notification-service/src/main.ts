/**
 * Application entry point for notification-service.
 * Creates a NestJS Fastify application and listens on the configured port.
 * Registers PG_POOL as a global provider for the reminder repository.
 * Starts the reminder worker to poll for due reminders and escalate missed ones.
 */

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import { Pool } from "pg";
import { AppModule } from "./app.module.js";
import { ReminderRepository } from "./reminders/reminder-repository.js";
import { ReminderDeliveryRepository } from "./reminders/reminder-delivery.js";
import { EscalationRepository } from "./reminders/escalation-repository.js";
import { ReminderService } from "./reminders/reminder.service.js";
import { EscalationService } from "./reminders/escalation-service.js";
import { ReminderWorker } from "./reminders/reminder.worker.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const pool = app.get("PG_POOL") as Pool;
  const reminderRepository = app.get(ReminderRepository);
  const deliveryRepository = app.get(ReminderDeliveryRepository);
  const escalationRepository = app.get(EscalationRepository);
  const reminderService = app.get(ReminderService);
  const escalationService = app.get(EscalationService);

  const worker = new ReminderWorker(reminderRepository, reminderService, escalationService, {
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 30000),
    batchSize: Number(process.env.BATCH_SIZE ?? 50),
    reclaimIntervalMs: Number(process.env.RECLAIM_INTERVAL_MS ?? 300000),
    reclaimStaleMinutes: Number(process.env.RECLAIM_STALE_MINUTES ?? 5),
  });
  worker.start();

  const port = process.env.PORT ?? 8006;
  await app.listen(port, "0.0.0.0");
  console.log(`Notification service listening on port ${port}`);
}

bootstrap();
