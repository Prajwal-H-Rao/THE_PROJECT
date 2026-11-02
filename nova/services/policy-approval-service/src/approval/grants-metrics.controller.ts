/** The approval metrics HTTP endpoints (Task 15). */

import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  SetMetadata,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { approvalMetrics } from "./approval-metrics.js";
import { formatPrometheus } from "./approval-metrics-format.js";
import { ServiceAuthGuard } from "../policy/service-auth.guard.js";

@ApiTags("policy-grants")
@Controller("policy")
@UseGuards(ServiceAuthGuard)
@SetMetadata("audience", "policy-service")
export class GrantsMetricsController {
  @Get("grants/metrics")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get approval wait and expiry metrics (Task 15)" })
  async getMetrics(@Query("format") format?: "json" | "prometheus"): Promise<unknown> {
    if (format === "prometheus") {
      return formatPrometheus(approvalMetrics);
    }
    return {
      metrics: approvalMetrics.getAll(),
      expiryEvents: approvalMetrics.getExpiryEvents(50),
    };
  }

  @Get("grants/metrics/wait-stats")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get wait time statistics per service:action" })
  @ApiQuery({ name: "service", required: true })
  @ApiQuery({ name: "action", required: true })
  async getWaitStats(@Query("service") service: string, @Query("action") action: string): Promise<{
    count: number;
    sumMs: number;
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  } | { error: string }> {
    if (!service || !action) {
      throw new BadRequestException({ error: "missing_params", message: "service and action query parameters are required" });
    }
    const stats = approvalMetrics.getWaitStats(service, action);
    if (!stats) {
      return { error: "no_data" };
    }
    return stats;
  }
}