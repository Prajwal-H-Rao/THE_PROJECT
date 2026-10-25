/** The policy decision HTTP endpoint. */

import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PolicyDecisionService } from "./policy-decision.service.js";
import { getPolicyVersion, bumpPolicyVersion, getPolicyVersionConfig } from "./policy-version.js";
import type { PolicyDecisionRequest, PolicyDecisionResponse } from "./policy-schema.js";
import type { PolicyRule, BulkDecisionRequest, BulkDecisionResponse } from "./policy-schema.js";

@ApiTags("policy")
@Controller("policy")
export class PolicyController {
  constructor(private readonly decisionService: PolicyDecisionService) {}

  @Post("decide")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Make a policy decision for an action" })
  @ApiResponse({ status: 200, description: "Policy decision", type: Object })
  async decide(@Body() request: PolicyDecisionRequest): Promise<PolicyDecisionResponse> {
    return this.decisionService.decide(request);
  }

  @Post("decide/bulk")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Make a bulk policy decision for multiple actions (Task 14)" })
  @ApiResponse({ status: 200, description: "Bulk policy decision", type: Object })
  async decideBulk(@Body() request: BulkDecisionRequest): Promise<BulkDecisionResponse> {
    return this.decisionService.decideBulk(request);
  }

  @Get("rules")
  @ApiOperation({ summary: "List all policy rules" })
  @ApiResponse({ status: 200, description: "Array of policy rules" })
  async getRules(): Promise<{ rules: PolicyRule[] }> {
    return { rules: [...this.decisionService.getAllRules()] };
  }

  @Get("rules/:ruleId")
  @ApiOperation({ summary: "Get a specific policy rule by ID" })
  @ApiResponse({ status: 200, description: "Policy rule" })
  @ApiResponse({ status: 404, description: "Rule not found" })
  async getRule(@Param("ruleId") ruleId: string): Promise<PolicyRule | { error: string }> {
    const rule = this.decisionService.getRule(ruleId);
    if (!rule) {
      return { error: `Rule ${ruleId} not found` };
    }
    return rule;
  }

  @Get("families")
  @ApiOperation({ summary: "List all policy families" })
  @ApiResponse({ status: 200, description: "Array of policy families" })
  async getFamilies(): Promise<{ families: ReturnType<PolicyDecisionService["getFamilies"]> }> {
    return { families: this.decisionService.getFamilies() };
  }

  @Get("validate")
  @ApiOperation({ summary: "Validate all families have rules" })
  @ApiResponse({ status: 200, description: "Validation result" })
  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    return this.decisionService.validateFamilies();
  }

  /** Get the current policy version. */
  @Get("version")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the current policy version" })
  @ApiResponse({ status: 200, description: "Current policy version" })
  async getVersion(): Promise<{ currentVersion: number }> {
    return getPolicyVersionConfig();
  }

  /** Bump the policy version. This invalidates all existing grants. */
  @Post("version/bump")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bump the policy version (invalidates all grants)" })
  @ApiResponse({ status: 200, description: "New policy version" })
  async bumpVersion(): Promise<{ currentVersion: number }> {
    const newVersion = bumpPolicyVersion();
    return { currentVersion: newVersion };
  }
}