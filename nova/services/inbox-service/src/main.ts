/**
 * Application entry point for the inbox service.
 * Creates a NestJS Fastify application and starts the PollingWorker.
 * Listens on the configured port.
 */

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { PollingWorker } from "./gmail/polling-worker.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env.PORT ?? 8003;
  await app.listen(port, "0.0.0.0");
  console.log(`Inbox service listening on port ${port}`);

  const worker = app.get(PollingWorker);
  worker.start();
}

bootstrap();
