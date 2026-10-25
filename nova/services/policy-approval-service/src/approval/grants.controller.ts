/** The grants HTTP endpoints. Internal RPC for the platform: no caller
 *  authentication yet (tasks 7 and 10 own the trust story). DTOs are plain
 *  interfaces by house style; service-level validation does the guarding.
 *  WHY: expiry is judged by the server clock only; a caller-supplied nowMs is
 *  stripped, so an expired grant can never verify from the wire. */

import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { GrantRecord, GrantVerdict, GrantVerifyAttempt } from "./grant-binding.js";
import type { CreateGrantInput, CreateGrantWithDetailsInput, EditGrantInput } from "./grants.service.js";
import type { ConsumeVerdict, RevokeVerdict, StatusVerdict, EditVerdict } from "./grant-repository-types.js";
import { GrantValidationError, GrantsService } from "./grants.service.js";
import { PolicyDecisionService } from "../policy/policy-decision.service.js";
import type { PolicyDecisionRequest, Sensitivity } from "../policy/policy-schema.js";

@ApiTags("policy-grants")
@Controller("policy")
export class GrantsController {
  constructor(
    private readonly grantsService: GrantsService,
    private readonly policyDecisionService: PolicyDecisionService
  ) {}

  @Post("grants")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create an approval grant bound to a payload hash" })
  create(@Body() input: CreateGrantInput): GrantRecord {
    try {
      return this.grantsService.createGrant(input);
    } catch (error) {
      if (error instanceof GrantValidationError) {
        throw new BadRequestException({ error: error.code, message: error.message });
      }
      throw error;
    }
  }

  @Post("grants/with-details")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create an approval grant with card preview details" })
  createWithDetails(@Body() input: CreateGrantWithDetailsInput): GrantRecord {
    try {
      return this.grantsService.createGrantWithDetails(input);
    } catch (error) {
      if (error instanceof GrantValidationError) {
        throw new BadRequestException({ error: error.code, message: error.message });
      }
      throw error;
    }
  }

  @Post("grants/:nonce/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify an attempt against a stored grant" })
  verify(@Param("nonce") nonce: string, @Body() attempt: GrantVerifyAttempt): GrantVerdict {
    // WHY: the clock stays server-side; the service-level injectable nowMs is
    // for tests and trusted internal callers, never for wire input.
    const { nowMs: _callerClock, ...rest } = attempt;
    return this.grantsService.verifyGrant(nonce, { ...rest, nowMs: Date.now() });
  }

  @Post("grants/:nonce/consume")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Consume a grant once" })
  async consume(@Param("nonce") nonce: string): Promise<ConsumeVerdict> {
    try {
      const verdict = await this.grantsService.consumeGrant(nonce);
      if (!verdict.ok) {
        if (verdict.reason === "already_used" || verdict.reason === "already_revoked") {
          throw new ConflictException({ error: verdict.reason, message: verdict.reason === "already_used" ? "Grant already consumed" : "Grant already revoked" });
        }
        if (verdict.reason === "unknown_nonce") {
          throw new NotFoundException({ error: "unknown_nonce", message: "Grant not found" });
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

  @Post("grants/:nonce/revoke")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke a grant" })
  async revoke(@Param("nonce") nonce: string): Promise<RevokeVerdict> {
    try {
      const verdict = await this.grantsService.revokeGrant(nonce);
      if (!verdict.ok) {
        if (verdict.reason === "already_used") {
          throw new ConflictException({ error: "already_used", message: "Grant already consumed" });
        }
        if (verdict.reason === "unknown_nonce") {
          throw new NotFoundException({ error: "unknown_nonce", message: "Grant not found" });
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

  @Get("grants/:nonce/card")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get approval card for display" })
  @ApiQuery({ name: "service", required: true, description: "Service requesting the card (validated against grant.service)" })
  async getCard(@Param("nonce") nonce: string, @Query("service") service: string): Promise<{
    target: string;
    preview: unknown;
    permissions: readonly string[];
    consequence: string;
    expiresAtMs: number;
    cardHash: string;
  }> {
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      throw new BadRequestException({ error: "invalid_nonce", message: "nonce must be a 32-char hex string" });
    }
    if (typeof service !== "string" || service === "") {
      throw new BadRequestException({ error: "invalid_service", message: "service query parameter is required" });
    }
    const card = await this.grantsService.getGrantCard(nonce, service);
    if (card === null) {
      throw new NotFoundException({ error: "no_preview", message: "Grant not found, service mismatch, or no preview available" });
    }
    return card;
  }
}