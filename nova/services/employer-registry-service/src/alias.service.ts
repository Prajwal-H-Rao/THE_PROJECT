/**
 * Nova design system - Employer Registry service.
 * EmployerAliasService: NestJS wrapper around the alias repository.
 * Importer-side alias capture lands with module 13 tasks 14 and 21;
 * this service exposes the recording capability to them.
 */

import { Injectable } from "@nestjs/common";
import { EmployerAliasRepository, AliasInsertInput } from "./alias.repository.js";
import { EmployerAlias } from "./alias.entity.js";

@Injectable()
export class EmployerAliasService {
  constructor(private readonly repository: EmployerAliasRepository) {}

  // Record one alias relationship. Persists and returns the stored row.
  async recordAlias(input: AliasInsertInput): Promise<EmployerAlias> {
    return this.repository.insertAlias(input);
  }

  // List every stored alias, including unresolved and unreviewed rows.
  async listAliases(): Promise<EmployerAlias[]> {
    return this.repository.listAliases();
  }
}
