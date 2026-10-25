/** The grants HTTP endpoints. Internal RPC for the platform: no caller
 * authentication yet (tasks 7 and 10 own the trust story). DTOs are plain
 * interfaces by house style; service-level validation does the guarding.
 * WHY: expiry is judged by the server clock only; a caller-supplied nowMs is
 * stripped, so an expired grant can never verify from the wire. */

import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { GrantRecord, GrantVerdict, GrantVerifyAttempt } from "./grant-binding.js";
import type { CreateGrantInput } from "./grants.service.js";
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
}
