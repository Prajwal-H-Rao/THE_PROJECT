/**
 * Nova design system - Remembered fact controller.
 * Handles GET /facts, GET /facts/:factId, PATCH /facts/:factId,
 * DELETE /facts/:factId (archive), DELETE /facts/:factId/forget (hard delete).
 * Extracts user_id from request headers for ownership checks.
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
import { FactService } from "./fact.service.js";
import type {
  RememberedFact,
  CreateFactInput,
  UpdateFactInput,
  FactListFilter,
} from "./fact.entity.js";

@Controller("facts")
export class FactController {
  constructor(private readonly service: FactService) {}

  @Post()
  async create(
    @Headers("x-user-id") userId: string,
    @Body() input: CreateFactInput,
  ): Promise<RememberedFact> {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    if (!input.factText) {
      throw new BadRequestException("factText is required");
    }
    try {
      return await this.service.createFact(userId, input);
    } catch (error) {
      if (error instanceof Error && error.name === "FactNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Get()
  async list(
    @Headers("x-user-id") userId: string,
    @Query("sourceType") sourceType?: string,
    @Query("isArchived") isArchived?: string,
  ): Promise<RememberedFact[]> {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    const filter: FactListFilter = {};
    if (sourceType) filter.sourceType = sourceType.split(",");
    if (isArchived !== undefined) filter.isArchived = isArchived === "true";
    return this.service.listFacts(userId, filter);
  }

  @Get(":factId")
  async getOne(
    @Headers("x-user-id") userId: string,
    @Param("factId") factId: string,
  ): Promise<RememberedFact> {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    try {
      return await this.service.sourceFact(userId, factId);
    } catch (error) {
      if (error instanceof Error && error.name === "FactNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Patch(":factId")
  async update(
    @Headers("x-user-id") userId: string,
    @Param("factId") factId: string,
    @Body() input: UpdateFactInput,
  ): Promise<RememberedFact> {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    try {
      return await this.service.editFact(userId, factId, input);
    } catch (error) {
      if (error instanceof Error && error.name === "FactNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Delete(":factId")
  async archive(
    @Headers("x-user-id") userId: string,
    @Param("factId") factId: string,
  ): Promise<{ ok: boolean }> {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    try {
      await this.service.archiveFact(userId, factId);
      return { ok: true };
    } catch (error) {
      if (error instanceof Error && error.name === "FactNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Delete(":factId/forget")
  async forget(
    @Headers("x-user-id") userId: string,
    @Param("factId") factId: string,
  ): Promise<{ ok: boolean }> {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    try {
      await this.service.forgetFact(userId, factId);
      return { ok: true };
    } catch (error) {
      if (error instanceof Error && error.name === "FactNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
