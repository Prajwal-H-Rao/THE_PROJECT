/**
 * Note controller handles note CRUD.
 * It exposes REST endpoints for note CRUD.
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
import { NoteService } from "./note.service.js";
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  NoteListFilter,
  NoteVersion,
  RestoreVersionInput,
} from "./note.entity.js";

@Controller("notes")
export class NoteController {
  constructor(private readonly service: NoteService) {}

  @Post()
  async create(
    @Headers("x-user-id") userId: string,
    @Body() input: CreateNoteInput,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    if (!input.title) {
      throw new BadRequestException("title is required");
    }
    return this.service.createNote(userId, input);
  }


  @Get(":noteId")
  async getOne(
    @Headers("x-user-id") userId: string,
    @Param("noteId") noteId: string,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    try {
      return await this.service.getNote(userId, noteId);
    } catch (error) {
      if (error instanceof Error && error.name === "NoteNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Get()
  async list(
    @Headers("x-user-id") userId: string,
    @Query("tags") tags?: string,
    @Query("isArchived") isArchived?: string,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    const filter: NoteListFilter = {};
    if (tags) filter.tags = tags.split(",");
    if (isArchived !== undefined) filter.isArchived = isArchived === "true";
    return this.service.listNotes(userId, filter);
  }

  @Patch(":noteId")
  async update(
    @Headers("x-user-id") userId: string,
    @Param("noteId") noteId: string,
    @Body() input: UpdateNoteInput,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    try {
      return await this.service.updateNote(userId, noteId, input);
    } catch (error) {
      if (error instanceof Error && error.name === "NoteNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Delete(":noteId")
  async delete(
    @Headers("x-user-id") userId: string,
    @Param("noteId") noteId: string,
  ) {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    try {
      await this.service.deleteNote(userId, noteId);
      return { ok: true };
    } catch (error) {
      if (error instanceof Error && error.name === "NoteNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Get(":noteId/versions")
  async getVersionHistory(
    @Headers("x-user-id") userId: string,
    @Param("noteId") noteId: string,
  ): Promise<NoteVersion[]> {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    return this.service.getVersionHistory(userId, noteId);
  }

  @Post(":noteId/restore")
  async restoreVersion(
    @Headers("x-user-id") userId: string,
    @Param("noteId") noteId: string,
    @Body() input: RestoreVersionInput,
  ): Promise<Note> {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    try {
      return await this.service.restoreVersion(userId, input.noteVersionId);
    } catch (error) {
      if (error instanceof Error && error.name === "NoteNotFoundError") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Get(":noteId/versions/:versionId")
  async getVersion(
    @Headers("x-user-id") userId: string,
    @Param("noteId") noteId: string,
    @Param("versionId") versionId: string,
  ): Promise<NoteVersion | null> {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    return this.service.getVersion(userId, versionId);
  }
}
