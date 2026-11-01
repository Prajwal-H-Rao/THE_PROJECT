/**
 * Tasks module - wires TaskRepository and TaskService.
 */

import { Module } from "@nestjs/common";
import { TaskRepository } from "./task.repository.js";
import { TaskService } from "./task.service.js";
import { TaskController } from "./task.controller.js";

@Module({
  providers: [TaskRepository, TaskService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TasksModule {}
