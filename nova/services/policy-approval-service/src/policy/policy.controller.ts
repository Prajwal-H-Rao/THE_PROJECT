/** The policy decision HTTP endpoint. */

import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PolicyDecisionService } from "./policy-decision.service.js";
import type { PolicyDecisionRequest, PolicyDecisionResponse } from "./policy-schema.js";
import type { PolicyRule } from "./policy-schema.js";

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
}