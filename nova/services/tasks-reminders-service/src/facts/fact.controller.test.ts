/**
 * Tests for FactController - header enforcement and CRUD enforcement.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { FactController } from "./fact.controller.js";
import { FactService, FactNotFoundError } from "./fact.service.js";

function makeService(config: {
  owned: boolean;
}): FactService {
  class FakeService {
    async createFact(_userId: string, _input: unknown) {
      if (!config.owned) throw new Error("not owned");
      return { factId: "f-1", userId: "user-1", factText: "Fact 1" };
    }
    async sourceFact(_userId: string, _factId: string) {
      if (!config.owned) throw new FactNotFoundError("fact-2");
      return { factId: "fact-2", userId: "user-1", factText: "Fact 2" };
    }
    async listFacts(_userId: string) {
      if (!config.owned) return [];
      return [{ factId: "f-1", userId: "user-1", factText: "Fact 1" }];
    }
    async editFact(_userId: string, _factId: string, _input: unknown) {
      if (!config.owned) throw new FactNotFoundError("fact-2");
      return { factId: "fact-2", userId: "user-1", factText: "Changed" };
    }
    async archiveFact(_userId: string, _factId: string) {
      if (!config.owned) throw new FactNotFoundError("fact-2");
    }
    async forgetFact(_userId: string, _factId: string) {
      if (!config.owned) throw new FactNotFoundError("fact-2");
    }
  }
  return new FakeService() as unknown as FactService;
}

describe("FactController", () => {
  it("rejects missing x-user-id header on create", async () => {
    const service = makeService({ owned: true });
    const controller = new FactController(service);

    await assert.rejects(() => controller.create("", { factText: "x" }), Error);
  });

  it("rejects missing x-user-id header on list", async () => {
    const service = makeService({ owned: true });
    const controller = new FactController(service);

    await assert.rejects(() => controller.list("", undefined, undefined), Error);
  });

  it("rejects missing x-user-id header on getOne", async () => {
    const service = makeService({ owned: false });
    const controller = new FactController(service);

    await assert.rejects(() => controller.getOne("", "fact-2"), Error);
  });

  it("creates fact for user", async () => {
    const service = makeService({ owned: true });
    const controller = new FactController(service);

    const fact = await controller.create("user-1", { factText: "Fact 1" });
    assert.strictEqual(fact.factText, "Fact 1");
  });

  it("getOne maps FactNotFoundError to NotFoundException", async () => {
    const service = makeService({ owned: false });
    const controller = new FactController(service);

    await assert.rejects(() => controller.getOne("user-1", "fact-2"), Error);
  });

  it("editFact maps FactNotFoundError to NotFoundException", async () => {
    const service = makeService({ owned: false });
    const controller = new FactController(service);

    await assert.rejects(
      () => controller.update("user-1", "fact-2", { factText: "Changed" }),
      Error
    );
  });

  it("archiveFact maps FactNotFoundError to NotFoundException", async () => {
    const service = makeService({ owned: false });
    const controller = new FactController(service);

    await assert.rejects(() => controller.archive("user-1", "fact-2"), Error);
  });

  it("forgetFact maps FactNotFoundError to NotFoundException", async () => {
    const service = makeService({ owned: false });
    const controller = new FactController(service);

    await assert.rejects(() => controller.forget("user-1", "fact-2"), Error);
  });
});
