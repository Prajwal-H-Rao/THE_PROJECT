/** Grant lifecycle HTTP endpoints (approve, reject, expire, edit). */

import { BadRequestException, Body, ConflictException, Controller, HttpCode, HttpStatus, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { StatusVerdict, EditVerdict } from "./grant-repository-types.js";
import { GrantValidationError, GrantsService } from "./grants.service.js";
import { PolicyDecisionService } from "../policy/policy-decision.service.js";
import type { PolicyDecisionRequest, Sensitivity } from "../policy/policy-schema.js";
import type { EditGrantInput } from "./grants.service.js";

@ApiTags("policy-grants")
@Controller("policy")
export class GrantsLifecycleController {
  constructor(
    private readonly grantsService: GrantsService,
    private readonly policyDecisionService: PolicyDecisionService
  ) {}

  @Post("grants/:nonce/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Approve a grant" })
  async approve(@Param("nonce") nonce: string, @Body() body: { decidedBy: string }): Promise<StatusVerdict> {
    try {
      const verdict = await this.grantsService.approveGrant(nonce, body.decidedBy);
      if (!verdict.ok) {
        throw new NotFoundException({ error: "unknown_nonce", message: "Grant not found" });
      }
      return verdict;
    } catch (error) {
      if (error instanceof GrantValidationError) {
        throw new BadRequestException({ error: error.code, message: error.message });
      }
      throw error;
    }
  }

  @Post("grants/:nonce/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reject a grant" })
  async reject(@Param("nonce") nonce: string, @Body() body: { decidedBy: string }): Promise<StatusVerdict> {
    try {
      const verdict = await this.grantsService.rejectGrant(nonce, body.decidedBy);
      if (!verdict.ok) {
        throw new NotFoundException({ error: "unknown_nonce", message: "Grant not found" });
      }
      return verdict;
    } catch (error) {
      if (error instanceof GrantValidationError) {
        throw new BadRequestException({ error: error.code, message: error.message });
      }
      throw error;
    }
  }

  @Post("grants/:nonce/expire")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Expire a grant" })
  async expire(@Param("nonce") nonce: string, @Body() body: { decidedBy: string }): Promise<StatusVerdict> {
    try {
      const verdict = await this.grantsService.expireGrant(nonce, body.decidedBy);
      if (!verdict.ok) {
        throw new NotFoundException({ error: "unknown_nonce", message: "Grant not found" });
      }
      return verdict;
    } catch (error) {
      if (error instanceof GrantValidationError) {
        throw new BadRequestException({ error: error.code, message: error.message });
      }
      throw error;
    }
  }

  @Post("grants/:nonce/edit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Edit a grant: re-hash and re-route to policy" })
  async edit(@Param("nonce") nonce: string, @Body() input: EditGrantInput): Promise<EditVerdict> {
    try {
      // Build a policy decision request from the edit input
      const policyRequest: PolicyDecisionRequest = {
        actor: "user",
        scope: `${input.allowedActions?.[0] ?? "edit"}`,
        action: "edit",
        target: input.payload && typeof input.payload === "object" && "target" in input.payload
          ? String((input.payload as any).target)
          : "edited",
        sensitivity: input.sensitivity as Sensitivity | undefined,
        payloadHash: undefined,
      };

      const policyDecision = this.policyDecisionService.decide(policyRequest);

      const verdict = await this.grantsService.editGrant(nonce, input, {
        decision: policyDecision.decision,
        ruleId: policyDecision.ruleId,
        policyVersion: policyDecision.policyVersion,
        requiresStepUp: policyDecision.approvalRequired?.requiresStepUp,
      });

      if (!verdict.ok) {
        if (verdict.reason === "unknown_nonce") {
          throw new NotFoundException({ error: "unknown_nonce", message: "Grant not found" });
        }
        if (verdict.reason === "already_terminal") {
          throw new ConflictException({ error: "already_terminal", message: "Grant already decided, consumed, or revoked" });
        }
        if (verdict.reason === "policy_denied") {
          throw new ConflictException({ error: "policy_denied", message: "Policy denies the edited action" });
        }
        if (verdict.reason === "policy_needs_approval") {
          throw new ConflictException({ error: "policy_needs_approval", message: "Edited action requires fresh approval" });
        }
      }
      return verdict;
    } catch (error) {
      if (error instanceof GrantValidationError) {
        throw new BadRequestException({ error: error.code, message: error.message });
      }
      throw error;
    }
  }
}