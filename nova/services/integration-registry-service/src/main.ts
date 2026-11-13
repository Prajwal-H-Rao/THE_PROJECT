/**
 * Application entry point for the integration-registry service.
 * Creates a NestJS Fastify application and starts listening on port 8004.
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

  const port = process.env.PORT ?? 8004;
  await app.listen(port, "0.0.0.0");
  console.log(`Integration registry service listening on port ${port}`);
}

bootstrap();
