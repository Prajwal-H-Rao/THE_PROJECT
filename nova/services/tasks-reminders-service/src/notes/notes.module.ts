/**
 * Notes module wires NoteRepository, NoteService and NoteController.
 * It exports NoteService for use by AppModule.
 */

import { Module } from "@nestjs/common";
import { NoteRepository } from "./note.repository.js";
import { NoteService } from "./note.service.js";
import { NoteController } from "./note.controller.js";

@Module({
  providers: [NoteRepository, NoteService],
  controllers: [NoteController],
  exports: [NoteService],
})
export class NotesModule {}
