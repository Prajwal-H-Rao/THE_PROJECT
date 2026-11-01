/**
 * Root application module for shell-service.
 */

import { Module } from "@nestjs/common";
import { ShellServiceModule } from "./shell.service.js";

@Module({
  imports: [ShellServiceModule],
})
export class AppModule {}
