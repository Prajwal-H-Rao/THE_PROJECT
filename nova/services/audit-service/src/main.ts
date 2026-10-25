/** The audit service application entry point. */

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AuditModule } from "./audit.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AuditModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const config = new DocumentBuilder()
    .setTitle("NOVA Audit Service")
    .setDescription("Records policy decisions with version and correlation ID")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  console.log(`Audit service listening on port ${port}`);
}

bootstrap();