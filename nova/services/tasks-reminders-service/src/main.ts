/**
 * Application entry point for tasks-reminders-service.
 * Creates a NestJS Fastify application and listens on the configured port.
 * Registers PG_POOL as a global provider for the task repository.
 */

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import { Pool } from "pg";
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

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  app.use((req: any, res: any, next: any) => {
    (req as any).pgPool = pool;
    next();
  });

  const port = process.env.PORT ?? 8005;
  await app.listen(port, "0.0.0.0");
  console.log(`Tasks reminders service listening on port ${port}`);
}

bootstrap();
