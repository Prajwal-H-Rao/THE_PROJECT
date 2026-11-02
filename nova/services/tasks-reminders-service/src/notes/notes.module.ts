/**
 * Notes module wires NoteRepository, NoteService and NoteController.
 * It exports NoteService for use by AppModule.
 */

import { Module } from "@nestjs/common";
import { NoteRepository } from "./note.repository.js";
import { NoteService } from "./note.service.js";
import { NoteController } from "./note.controller.js";
import { NoteObjectStorage } from "./note.object-storage-repo.js";
import { InMemoryObjectStore } from "./note.object-storage.js";

const OBJECT_STORE = "OBJECT_STORE";

@Module({
  providers: [
    NoteRepository,
    NoteService,
    NoteObjectStorage,
    { provide: OBJECT_STORE, useClass: InMemoryObjectStore },
  ],
  controllers: [NoteController],
  exports: [NoteService],
})
export class NotesModule {}
