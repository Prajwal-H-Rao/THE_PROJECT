/**
 * Task controller - REST endpoints for task CRUD.
 * Extracts user_id from request headers (x-user-id) for ownership checks.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { TaskService } from "./task.service.js";
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskListFilter,
} from "./task.entity.js";

@Controller("tasks")
export class TaskController {
  constructor(private readonly service: TaskService) {}

  /** Create one task. */
  @Post()
  async create(
    @Headers("x-user-id") userId: string,
    @Body() input: CreateTaskInput
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    if (!input.title) {
      throw new BadRequestException("title is required");
    }
    return this.service.createTask(userId, input);
  }

  /** Read one task by ID. */
  @Get(":taskId")
  async getOne(
    @Headers("x-user-id") userId: string,
    @Param("taskId") taskId: string
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    try {
      return await this.service.getTask(userId, taskId);
    } catch (error) {
      if (error instanceof Error && error.name === "TaskNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /** List tasks for one user. */
  @Get()
  async list(
    @Headers("x-user-id") userId: string,
    @Query("status") status?: string,
    @Query("dueAt") dueAt?: string
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    const filter: TaskListFilter = {};
    if (status) filter.status = status;
    if (dueAt) filter.dueAt = dueAt;
    return this.service.listTasks(userId, filter);
  }

  /** Update one task. */
  @Patch(":taskId")
  async update(
    @Headers("x-user-id") userId: string,
    @Param("taskId") taskId: string,
    @Body() input: UpdateTaskInput
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    try {
      return await this.service.updateTask(userId, taskId, input);
    } catch (error) {
      if (error instanceof Error && error.name === "TaskNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /** Delete one task. */
  @Delete(":taskId")
  async delete(
    @Headers("x-user-id") userId: string,
    @Param("taskId") taskId: string
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    try {
      await this.service.deleteTask(userId, taskId);
      return { ok: true };
    } catch (error) {
      if (error instanceof Error && error.name === "TaskNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
