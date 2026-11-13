/**
 * Application entry point for the Telegram channel adapter.
 * Creates a NestJS Fastify application and starts listening on the configured port.
 * Spec:764 - verifies the X-Telegram-Bot-Api-Secret-Token header on every webhook.
 */

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env.PORT ?? 8012;
  await app.listen(port, "0.0.0.0");
  console.log(`Telegram adapter listening on port ${port}`);
}

bootstrap();
