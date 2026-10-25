/** The audit service health endpoints. */

import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get("live")
  live(): { status: string } {
    return { status: "live" };
  }

  @Get("ready")
  ready(): { status: string } {
    return { status: "ready" };
  }
}