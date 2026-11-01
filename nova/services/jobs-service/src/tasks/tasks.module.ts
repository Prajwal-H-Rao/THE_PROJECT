/**
 * Nova design system - Tasks module.
 * Wires TaskRepository and TaskService.
 */

import { Module } from "@nestjs/common";
import { TaskRepository } from "./task.repository.js";
import { TaskService } from "./task.service.js";

@Module({
  providers: [TaskRepository, TaskService],
  exports: [TaskService, TaskRepository],
})
export class TasksModule {}
