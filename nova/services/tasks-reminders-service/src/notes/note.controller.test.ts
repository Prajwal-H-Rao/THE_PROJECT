/**
 * Tests for NoteController - header enforcement and CRUD enforcement.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { NoteController } from "./note.controller.js";
import { NoteService, NoteNotFoundError } from "./note.service.js";

function makeService(config: {
  owned: boolean;
}): NoteService {
  class FakeService {
    async createNote(_userId: string, _input: unknown) {
      if (!config.owned) throw new Error("not owned");
      return { noteId: "n-1", userId: "user-1", title: "Note 1" };
    }
    async getNote(_userId: string, _noteId: string) {
      if (!config.owned) throw new NoteNotFoundError("note-2");
      return { noteId: "note-2", userId: "user-1", title: "Note 2" };
    }
    async listNotes(_userId: string) {
      if (!config.owned) return [];
      return [{ noteId: "n-1", userId: "user-1", title: "Note 1" }];
    }
    async updateNote(_userId: string, _noteId: string, _input: unknown) {
      if (!config.owned) throw new NoteNotFoundError("note-2");
      return { noteId: "note-2", userId: "user-1", title: "Changed" };
    }
    async deleteNote(_userId: string, _noteId: string) {
      if (!config.owned) throw new NoteNotFoundError("note-2");
      return undefined;
    }
  }
  return new FakeService() as unknown as NoteService;
}

describe("NoteController", () => {
  it("rejects missing x-user-id header", async () => {
    const service = makeService({ owned: true });
    const controller = new NoteController(service);

    await assert.rejects(() => controller.create("", { title: "x", content: "" }), Error);
  });

  it("creates note for user", async () => {
    const service = makeService({ owned: true });
    const controller = new NoteController(service);

    const note = await controller.create("user-1", { title: "Note 1", content: "" });
    assert.strictEqual(note.title, "Note 1");
  });

  it("getOne maps NoteNotFoundError to NotFoundException", async () => {
    const service = makeService({ owned: false });
    const controller = new NoteController(service);

    await assert.rejects(
      () => controller.getOne("user-1", "note-2"),
      Error
    );
  });

  it("updateNote maps NoteNotFoundError to NotFoundException", async () => {
    const service = makeService({ owned: false });
    const controller = new NoteController(service);

    await assert.rejects(
      () => controller.update("user-1", "note-2", { title: "Changed" }),
      Error
    );
  });

  it("deleteNote maps NoteNotFoundError to NotFoundException", async () => {
    const service = makeService({ owned: false });
    const controller = new NoteController(service);

    await assert.rejects(() => controller.delete("user-1", "note-2"), Error);
  });
});
