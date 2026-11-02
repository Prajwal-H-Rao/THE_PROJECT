/**
 * The policy admin HTTP endpoints (Layer 10: admin plane network rule).
 * These endpoints are only accessible from the nova-admin network.
 * All endpoints require a valid service JWT via ServiceAuthGuard.
 */

import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Headers,
  ForbiddenException,
  UnauthorizedException,
  UseGuards,
  SetMetadata,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PolicyDecisionService } from "./policy-decision.service.js";
import { getPolicyVersionConfig } from "./policy-version.js";
import type { PolicyRule } from "./policy-schema.js";
import { verifyToken, ServiceClaims } from "@nova/contracts";
import { CallerContext } from "./authorization.js";
import { ServiceAuthGuard } from "./service-auth.guard.js";

const ADMIN_SCOPE = "policy:admin";

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
    audience: "policy-admin-service",
  }, nowSeconds);
  if (!result.ok) {
    throw new UnauthorizedException("Invalid or expired token");
  }
  const claims: ServiceClaims = result.claims;
  const scopes = claims.scope.split(" ");
  return { service: claims.sub, scopes, userId: claims.sub, resourceOwnerId: undefined };
}

@ApiTags("policy-admin")
@Controller("policy-admin")
@UseGuards(ServiceAuthGuard)
@SetMetadata("audience", "policy-admin-service")
export class PolicyAdminController {
  constructor(private readonly decisionService: PolicyDecisionService) {}

  @Get("rules")
  @ApiOperation({ summary: "List all policy rules" })
  @ApiResponse({ status: 200, description: "Array of policy rules" })
  async getRules(
    @Headers("authorization") authHeader: string | undefined
  ): Promise<{ rules: PolicyRule[] }> {
    const caller = extractCallerContext(authHeader);
    if (!caller.scopes.includes(ADMIN_SCOPE)) {
      throw new ForbiddenException({ error: "insufficient_scope", message: "Admin scope required" });
    }
    return { rules: [...this.decisionService.getAllRules()] };
  }

  @Get("rules/:ruleId")
  @ApiOperation({ summary: "Get a specific policy rule by ID" })
  @ApiResponse({ status: 200, description: "Policy rule" })
  @ApiResponse({ status: 404, description: "Rule not found" })
  async getRule(
    @Param("ruleId") ruleId: string,
    @Headers("authorization") authHeader: string | undefined
  ): Promise<PolicyRule | { error: string }> {
    const caller = extractCallerContext(authHeader);
    if (!caller.scopes.includes(ADMIN_SCOPE)) {
      throw new ForbiddenException({ error: "insufficient_scope", message: "Admin scope required" });
    }
    const rule = this.decisionService.getRule(ruleId);
    if (!rule) {
      return { error: `Rule ${ruleId} not found` };
    }
    return rule;
  }

  @Get("families")
  @ApiOperation({ summary: "List all policy families" })
  @ApiResponse({ status: 200, description: "Array of policy families" })
  async getFamilies(
    @Headers("authorization") authHeader: string | undefined
  ): Promise<{ families: ReturnType<PolicyDecisionService["getFamilies"]> }> {
    const caller = extractCallerContext(authHeader);
    if (!caller.scopes.includes(ADMIN_SCOPE)) {
      throw new ForbiddenException({ error: "insufficient_scope", message: "Admin scope required" });
    }
    return { families: this.decisionService.getFamilies() };
  }

  @Get("validate")
  @ApiOperation({ summary: "Validate all families have rules" })
  @ApiResponse({ status: 200, description: "Validation result" })
  async validate(
    @Headers("authorization") authHeader: string | undefined
  ): Promise<{ valid: boolean; errors: string[] }> {
    const caller = extractCallerContext(authHeader);
    if (!caller.scopes.includes(ADMIN_SCOPE)) {
      throw new ForbiddenException({ error: "insufficient_scope", message: "Admin scope required" });
    }
    return this.decisionService.validateFamilies();
  }

  /** Get the current policy version. */
  @Get("version")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the current policy version" })
  @ApiResponse({ status: 200, description: "Current policy version" })
  async getVersion(
    @Headers("authorization") authHeader: string | undefined
  ): Promise<{ currentVersion: number }> {
    const caller = extractCallerContext(authHeader);
    if (!caller.scopes.includes(ADMIN_SCOPE)) {
      throw new ForbiddenException({ error: "insufficient_scope", message: "Admin scope required" });
    }
    return getPolicyVersionConfig();
  }
}
