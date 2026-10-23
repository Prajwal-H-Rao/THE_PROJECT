/** The health controller for the policy service. */

import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class HealthController {
  @Get("health/live")
  @ApiOperation({ summary: "Liveness probe" })
  @ApiResponse({ status: 200, description: "Service is live" })
  live(): { status: string } {
    return { status: "live" };
  }

  @Get("health/ready")
  @ApiOperation({ summary: "Readiness probe" })
  @ApiResponse({ status: 200, description: "Service is ready" })
  ready(): { status: string } {
    return { status: "ready" };
  }
}