/**
 * Tests for FactService - CRUD with ownership enforcement.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Pool } from "pg";
import { FactService, FactNotFoundError } from "./fact.service.js";
import { FactRepository } from "./fact.repository.js";
import type { CreateFactInput, UpdateFactInput, FactListFilter } from "./fact.entity.js";

function makeRepo(config: {
  owned: boolean;
}): FactRepository {
  const repo = new FactRepository({} as unknown as Pool);
  repo.getFact = async (_userId: string, _factId: string) => {
    if (!config.owned) return null;
    return {
      factId: _factId,
      userId: _userId,
      factText: "Remembered fact",
      sourceType: "manual",
      sourceRef: null,
      embedding: null,
      isArchived: false,
      createdAt: "t",
      updatedAt: "t",
    };
  };
  repo.listFacts = async (_userId: string, _filter?: FactListFilter) => {
    if (!config.owned) return [];
    return [
      {
        factId: "f-1",
        userId: _userId,
        factText: "Remembered fact 1",
        sourceType: "manual",
        sourceRef: null,
        embedding: null,
        isArchived: false,
        createdAt: "t",
        updatedAt: "t",
      },
    ];
  };
  repo.create = async (_userId: string, input: CreateFactInput) => ({
    factId: "f-1",
    userId: _userId,
    factText: input.factText,
    sourceType: input.sourceType ?? null,
    sourceRef: input.sourceRef ?? null,
    embedding: null,
    isArchived: false,
    createdAt: "t",
    updatedAt: "t",
  });
  repo.updateFact = async (_userId: string, _factId: string, input: UpdateFactInput) => {
    if (!config.owned) return null;
    return {
      factId: _factId,
      userId: _userId,
      factText: input.factText ?? "Remembered fact",
      sourceType: input.sourceType ?? null,
      sourceRef: input.sourceRef ?? null,
      embedding: null,
      isArchived: input.isArchived ?? false,
      createdAt: "t",
      updatedAt: "t",
    };
  };
  repo.archiveFact = async (_userId: string, _factId: string) => config.owned;
  repo.forgetFact = async (_userId: string, _factId: string) => config.owned;
  return repo;
}

describe("FactService", () => {
  it("creates fact for user", async () => {
    const repo = makeRepo({ owned: true });
    const service = new FactService(repo);

    const fact = await service.createFact("user-1", { factText: "Remember this" });
    assert.strictEqual(fact.factText, "Remember this");
    assert.strictEqual(fact.userId, "user-1");
  });

  it("sourceFact throws FactNotFoundError when user does not own fact", async () => {
    const repo = makeRepo({ owned: false });
    const service = new FactService(repo);

    await assert.rejects(
      () => service.sourceFact("user-1", "fact-2"),
      FactNotFoundError
    );
  });

  it("listFacts returns empty when no facts owned", async () => {
    const repo = makeRepo({ owned: false });
    const service = new FactService(repo);

    const facts = await service.listFacts("user-1");
    assert.strictEqual(facts.length, 0);
  });

  it("editFact throws FactNotFoundError when user does not own fact", async () => {
    const repo = makeRepo({ owned: false });
    const service = new FactService(repo);

    await assert.rejects(
      () => service.editFact("user-1", "fact-2", { factText: "Changed" }),
      FactNotFoundError
    );
  });

  it("archiveFact throws FactNotFoundError when user does not own fact", async () => {
    const repo = makeRepo({ owned: false });
    const service = new FactService(repo);

    await assert.rejects(
      () => service.archiveFact("user-1", "fact-2"),
      FactNotFoundError
    );
  });

  it("forgetFact throws FactNotFoundError when user does not own fact", async () => {
    const repo = makeRepo({ owned: false });
    const service = new FactService(repo);

    await assert.rejects(
      () => service.forgetFact("user-1", "fact-2"),
      FactNotFoundError
    );
  });
});
