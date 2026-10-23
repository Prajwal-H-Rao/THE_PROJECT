/** The application entry point. */

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("NOVA Policy & Approval Service")
    .setDescription("Policy decision engine and approval management")
    .setVersion("1.0.0")
    .addTag("policy")
    .addTag("health")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT ?? 8001;
  await app.listen(port, "0.0.0.0");
  console.log(`Policy service listening on port ${port}`);
}

bootstrap();