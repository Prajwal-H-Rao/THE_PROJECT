/**
 * Task controller handles task CRUD.
 * It exposes REST endpoints for task CRUD.
 * It extracts user_id from request headers for ownership checks.
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

  @Post()
  async create(
    @Headers("x-user-id") userId: string,
    @Body() input: CreateTaskInput,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    if (!input.title) {
      throw new BadRequestException("title is required");
    }
    return this.service.createTask(userId, input);
  }

  @Get(":taskId")
  async getOne(
    @Headers("x-user-id") userId: string,
    @Param("taskId") taskId: string,
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

  @Get()
  async list(
    @Headers("x-user-id") userId: string,
    @Query("status") status?: string,
    @Query("dueAt") dueAt?: string,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    const filter: TaskListFilter = {};
    if (status) filter.status = status;
    if (dueAt) filter.dueAt = dueAt;
    return this.service.listTasks(userId, filter);
  }

  @Patch(":taskId")
  async update(
    @Headers("x-user-id") userId: string,
    @Param("taskId") taskId: string,
    @Body() input: UpdateTaskInput,
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

  @Delete(":taskId")
  async delete(
    @Headers("x-user-id") userId: string,
    @Param("taskId") taskId: string,
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
