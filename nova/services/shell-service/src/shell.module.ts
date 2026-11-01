/**
 * Nova design system - Shell module.
 */

import { Module } from "@nestjs/common";
import { ShellService } from "./shell.service.js";

@Module({
  providers: [ShellService],
  exports: [ShellService],
})
export class ShellServiceModule {}
