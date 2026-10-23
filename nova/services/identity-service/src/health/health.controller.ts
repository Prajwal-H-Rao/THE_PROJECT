/** Health controller. */

import { Controller, Get, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  @Get("health/live")
  @ApiOperation({ summary: "Liveness probe" })
  @ApiResponse({ status: 200, description: "Service is live" })
  live(): { status: string } {
    return { status: "live" };
  }

  @Get("health/ready")
  @ApiOperation({ summary: "Readiness probe" })
  @ApiResponse({ status: 200, description: "Service is ready" })
  @ApiResponse({ status: 503, description: "Service not ready" })
  async ready(): Promise<{ status: string }> {
    try {
      await this.pool.query("SELECT 1");
      return { status: "ready" };
    } catch {
      return { status: "not ready" };
    }
  }
}