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
import { OBJECT_STORE } from "./note.object-storage.js";
import { NoteSearcher } from "./note.search.js";
import { NOTE_EMBEDDER } from "./note.search-vector.js";

@Module({
  providers: [
    NoteRepository,
    NoteService,
    NoteObjectStorage,
    { provide: OBJECT_STORE, useClass: InMemoryObjectStore },
    NoteSearcher,
    // Rerank ships disabled: plan row 12 wires the ML client adapter here.
    { provide: NOTE_EMBEDDER, useValue: null },
  ],
  controllers: [NoteController],
  exports: [NoteService, NoteSearcher],
})
export class NotesModule {}
