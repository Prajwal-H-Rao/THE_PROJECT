/**
 * Nova design system - Note search and export controller.
 * Handles GET /notes/search and GET /notes/:noteId/export.
 * Extracts user_id from request headers for ownership checks.
 */

import {
  Controller,
  Get,
  Query,
  Headers,
  Param,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { NoteService, SearchUnavailableError } from "./note.service.js";
import type {
  Note,
  NoteListFilter,
  NoteSearchResult,
} from "./note.entity.js";

@Controller("notes")
export class NoteSearchController {
  constructor(private readonly service: NoteService) {}

  @Get("search")
  async search(
    @Headers("x-user-id") userId: string,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
  ): Promise<NoteSearchResult[]> {
    if (!userId) {
      throw new BadRequestException("Missing x-user-id header");
    }
    const query = (q ?? "").trim();
    if (query.length === 0) {
      throw new BadRequestException("q is required");
    }
    try {
      return await this.service.searchNotes(
        userId,
        query,
        limit === undefined ? undefined : parseInt(limit, 10),
      );
    } catch (error) {
      if (error instanceof SearchUnavailableError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }
  }

  @Get(":noteId/export")
  async exportNote(
    @Headers("x-user-id") userId: string,
    @Param("noteId") noteId: string,
  ): Promise<Note> {
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
}
