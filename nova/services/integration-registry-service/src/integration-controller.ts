/**
 * Integration controller (task 20.11).
 * HTTP endpoints for the integration registry service.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { IntegrationService } from "./integration-service.js";

@Controller()
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get("integrations")
  async listIntegrations() {
    return this.integrationService.listIntegrations();
  }

  @Get("integrations/:integrationId")
  async getIntegration(@Param("integrationId") integrationId: string) {
    const integration = await this.integrationService.getIntegration(integrationId);
    if (!integration) {
      throw new NotFoundException(`Integration ${integrationId} not found`);
    }
    return integration;
  }

  @Post("integrations")
  async createIntegration(@Body() body: {
    integrationId: string;
    provider: string;
    name: string;
    status: string;
    grantedScopes: readonly string[];
    lastSync: string | null;
  }) {
    await this.integrationService.createIntegration(body);
    return { ok: true };
  }

  @Put("integrations/:integrationId")
  async updateIntegration(
    @Param("integrationId") integrationId: string,
    @Body() body: {
      status?: string;
      grantedScopes?: readonly string[];
      lastSync?: string | null;
    }
  ) {
    await this.integrationService.updateIntegration(integrationId, body);
    return { ok: true };
  }

  @Delete("integrations/:integrationId")
  async revokeIntegration(@Param("integrationId") integrationId: string) {
    await this.integrationService.revokeIntegration(integrationId);
    return { ok: true };
  }
}
