/** The policy decision HTTP endpoint. */

import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus, Headers, BadRequestException, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PolicyDecisionService } from "./policy-decision.service.js";
import { getPolicyVersion, bumpPolicyVersion, getPolicyVersionConfig } from "./policy-version.js";
import type { PolicyDecisionRequest, PolicyDecisionResponse } from "./policy-schema.js";
import type { PolicyRule } from "./policy-schema.js";
import type { BulkDecisionRequest, BulkDecisionResponse } from "./policy-bulk-schema.js";
import { verifyToken, ServiceClaims } from "@nova/contracts";
import { CallerContext } from "./authorization.js";

const ADMIN_SCOPE = "policy:admin";

function getServiceJwtSecret(): string {
  return process.env.NOVA_SERVICE_JWT_SECRET ?? "test-secret-key-32-bytes-minimum!!";
}

function getServiceJwtIssuer(): string {
  return process.env.NOVA_SERVICE_JWT_ISSUER ?? "test-issuer";
}

function extractCallerContext(authHeader: string | undefined): CallerContext {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { service: "unknown", scopes: [], userId: undefined, resourceOwnerId: undefined };
  }
  const token = authHeader.slice(7);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const result = verifyToken(token, getServiceJwtSecret(), {
    issuer: getServiceJwtIssuer(),
    audience: "policy-service",
  }, nowSeconds);
  if (!result.ok) {
    return { service: "unknown", scopes: [], userId: undefined, resourceOwnerId: undefined };
  }
  const claims: ServiceClaims = result.claims;
  const scopes = claims.scope.split(" ");
  return { service: claims.sub, scopes, userId: claims.sub, resourceOwnerId: undefined };
}

@ApiTags("policy")
@Controller("policy")
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
    // Fail closed if the request carries a user-plane rule but no identity.
    // The authorization gate inside decide() will enforce this.
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

  /** Bump the policy version. This invalidates all existing grants. */
  @Post("version/bump")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bump the policy version (invalidates all grants)" })
  @ApiResponse({ status: 200, description: "New policy version" })
  async bumpVersion(
    @Headers("authorization") authHeader: string | undefined
  ): Promise<{ currentVersion: number }> {
    const caller = extractCallerContext(authHeader);
    if (!caller.scopes.includes(ADMIN_SCOPE)) {
      throw new ForbiddenException({ error: "insufficient_scope", message: "Admin scope required" });
    }
    const newVersion = bumpPolicyVersion();
    return { currentVersion: newVersion };
  }
}