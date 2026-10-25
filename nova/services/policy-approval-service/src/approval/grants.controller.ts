/** The grants HTTP endpoints. Internal RPC for the platform: no caller
 * authentication yet (tasks 7 and 10 own the trust story). DTOs are plain
 * interfaces by house style; service-level validation does the guarding.
 * WHY: expiry is judged by the server clock only; a caller-supplied nowMs is
 * stripped, so an expired grant can never verify from the wire. */

import { BadRequestException, Body, ConflictException, Controller, HttpCode, HttpStatus, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { GrantRecord, GrantVerdict, GrantVerifyAttempt } from "./grant-binding.js";
import type { ConsumeVerdict, CreateGrantInput, RevokeVerdict } from "./grants.service.js";
import { GrantValidationError, GrantsService } from "./grants.service.js";

@ApiTags("policy-grants")
@Controller("policy")
export class GrantsController {
  constructor(private readonly grantsService: GrantsService) {}

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
}