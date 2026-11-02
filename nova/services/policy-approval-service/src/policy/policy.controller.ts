/**
 * The policy decision HTTP endpoint (service endpoints).
 * All endpoints require a valid service JWT via ServiceAuthGuard.
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
  UnauthorizedException,
  UseGuards,
  SetMetadata,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PolicyDecisionService } from "./policy-decision.service.js";
import type { PolicyDecisionRequest, PolicyDecisionResponse } from "./policy-schema.js";
import type { BulkDecisionRequest, BulkDecisionResponse } from "./policy-bulk-schema.js";
import { verifyToken, ServiceClaims } from "@nova/contracts";
import { CallerContext } from "./authorization.js";
import { ServiceAuthGuard } from "./service-auth.guard.js";

function getServiceJwtSecret(): string {
  return process.env.NOVA_SERVICE_JWT_SECRET ?? "test-secret-key-32-bytes-minimum!!";
}

function getServiceJwtIssuer(): string {
  return process.env.NOVA_SERVICE_JWT_ISSUER ?? "test-issuer";
}

function extractCallerContext(authHeader: string | undefined): CallerContext {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedException("Missing or invalid authorization header");
  }
  const token = authHeader.slice(7);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const result = verifyToken(token, getServiceJwtSecret(), {
    issuer: getServiceJwtIssuer(),
    audience: "policy-service",
  }, nowSeconds);
  if (!result.ok) {
    throw new UnauthorizedException("Invalid or expired token");
  }
  const claims: ServiceClaims = result.claims;
  const scopes = claims.scope.split(" ");
  return { service: claims.sub, scopes, userId: claims.sub, resourceOwnerId: undefined };
}

@ApiTags("policy")
@Controller("policy")
@UseGuards(ServiceAuthGuard)
@SetMetadata("audience", "policy-service")
export class PolicyController {
  constructor(private readonly decisionService: PolicyDecisionService) {}

  @Post("decide")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Make a policy decision for an action" })
  @ApiResponse({ status: 200, description: "Policy decision", type: Object })
  async decide(
    @Body() request: PolicyDecisionRequest,
    @Headers("authorization") authHeader: string | undefined
  ): Promise<PolicyDecisionResponse> {
    const caller = extractCallerContext(authHeader);
    return this.decisionService.decide(request, caller);
  }

  @Post("decide/bulk")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Make a bulk policy decision for multiple actions (Task 14)" })
  @ApiResponse({ status: 200, description: "Bulk policy decision", type: Object })
  async decideBulk(
    @Body() request: BulkDecisionRequest,
    @Headers("authorization") authHeader: string | undefined
  ): Promise<BulkDecisionResponse> {
    const caller = extractCallerContext(authHeader);
    return this.decisionService.decideBulk(request, caller);
  }
}
