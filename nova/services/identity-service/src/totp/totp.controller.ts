/** TOTP controller for 2FA management. */

import { Controller, Get, Post, Body, Req, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { TotpService } from "./totp.service.js";
import { SessionService } from "../session/session.service.js";

@ApiTags("totp")
@ApiBearerAuth()
@Controller("totp")
export class TotpController {
  constructor(
    private readonly totp: TotpService,
    private readonly sessionService: SessionService
  ) {}

  @Get("setup")
  @ApiOperation({ summary: "Get TOTP setup info (secret + QR code URI)" })
  @ApiResponse({ status: 200, description: "TOTP secret and URI" })
  async setup(@Req() req: any): Promise<{ secret: string; uri: string }> {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");

    const validation = await this.sessionService.validateToken(token);
    if (!validation) throw new Error("Invalid session");

    const secret = this.totp.generateSecret();
    const uri = this.totp.getTotpUri(secret, validation.claims.tenant);
    return { secret, uri };
  }

  @Post("enable")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Enable TOTP with verified token and backup codes" })
  @ApiResponse({ status: 200, description: "TOTP enabled with backup codes" })
  async enable(
    @Req() req: any,
    @Body() body: { token: string }
  ): Promise<{ backupCodes: string[] }> {
    const authToken = req.headers?.authorization?.replace("Bearer ", "");
    if (!authToken) throw new Error("Unauthorized");

    const validation = await this.sessionService.validateToken(authToken);
    if (!validation) throw new Error("Invalid session");

    const secretResult = await this.totp.getTotpSecret(validation.claims.sub);
    if (!secretResult) throw new Error("No TOTP setup in progress");

    const { valid } = await this.totp.verifyLogin(validation.claims.sub, body.token);
    if (!valid) throw new Error("Invalid TOTP token");

    const backupCodes = this.totp.generateBackupCodes();
    await this.totp.enableTotp(validation.claims.sub, secretResult.secret, backupCodes);

    return { backupCodes };
  }

  @Post("disable")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disable TOTP" })
  @ApiResponse({ status: 200, description: "TOTP disabled" })
  async disable(@Req() req: any): Promise<{ ok: boolean }> {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");

    const validation = await this.sessionService.validateToken(token);
    if (!validation) throw new Error("Invalid session");

    await this.totp.disableTotp(validation.claims.sub);
    return { ok: true };
  }

  @Post("verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify TOTP token (for step-up auth)" })
  @ApiResponse({ status: 200, description: "Token verification result" })
  async verify(@Req() req: any, @Body() body: { token: string }): Promise<{ valid: boolean; usedBackupCode: boolean }> {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");

    const validation = await this.sessionService.validateToken(token);
    if (!validation) throw new Error("Invalid session");

    return this.totp.verifyLogin(validation.claims.sub, body.token);
  }
}