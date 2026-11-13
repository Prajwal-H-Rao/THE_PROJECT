/**
 * Application entry point for the WhatsApp channel adapter.
 * Creates a NestJS Fastify application and starts listening on the configured port.
 * Spec:772 - verifies webhook authenticity using HMAC-SHA256 over the raw body
 * with the configured app secret, using constant-time comparison.
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

  const port = process.env.PORT ?? 8016;
  await app.listen(port, "0.0.0.0");
  console.log(`WhatsApp adapter listening on port ${port}`);
}

bootstrap();
