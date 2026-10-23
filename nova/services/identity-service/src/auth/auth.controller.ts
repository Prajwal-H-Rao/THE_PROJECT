/** Auth controller for OIDC flows. */

import { Controller, Get, Query, Post, Body, Res, Req, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import type { Response, Request } from "express";
import { OidcService, OidcProviderConfig } from "./oidc.service.js";
import { SessionService } from "../session/session.service.js";
import { ConfigService } from "@nestjs/config";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly oidc: OidcService,
    private readonly sessionService: SessionService,
    private readonly config: ConfigService
  ) {}

  @Get("login/:provider")
  @ApiOperation({ summary: "Initiate OIDC login" })
  @ApiQuery({ name: "redirect_uri", required: true })
  @ApiQuery({ name: "provider", enum: ["google", "github"] })
  @ApiResponse({ status: 302, description: "Redirects to provider" })
  async login(
    @Query("provider") provider: "google" | "github",
    @Query("redirect_uri") redirectUri: string,
    @Res() res: Response
  ): Promise<void> {
    const { url } = await this.oidc.getAuthorizationUrl(provider, redirectUri);
    res.redirect(url);
  }

  @Get("callback/:provider")
  @ApiOperation({ summary: "OIDC callback" })
  @ApiQuery({ name: "code", required: true })
  @ApiQuery({ name: "state", required: true })
  @ApiQuery({ name: "redirect_uri", required: true })
  @ApiResponse({ status: 302, description: "Redirects to frontend with token" })
  async callback(
    @Query("provider") provider: "google" | "github",
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("redirect_uri") redirectUri: string,
    @Res() res: Response
  ): Promise<void> {
    try {
      const { tokens, stateRecord } = await this.oidc.exchangeCode(provider, code, state, redirectUri);
      const userInfo = await this.oidc.fetchUserInfo(provider, tokens.access_token);
      const { userId, isNew } = await this.oidc.findOrCreateUser(provider, userInfo);

      // Create session
      const { token, csrfToken } = await this.sessionService.createSession(
        userId,
        userInfo.hd ?? "default",
        provider
      );

      // Build redirect URL with token and csrf in query params (or set cookies)
      const frontendUrl = this.config.get("FRONTEND_URL") ?? "http://localhost:3000";
      const callbackUrl = new URL(`${frontendUrl}/auth/callback`);
      callbackUrl.searchParams.set("token", token);
      callbackUrl.searchParams.set("csrf", csrfToken);
      callbackUrl.searchParams.set("new_user", String(isNew));

      res.redirect(callbackUrl.toString());
    } catch (error) {
      const frontendUrl = this.config.get("FRONTEND_URL") ?? "http://localhost:3000";
      const errorUrl = new URL(`${frontendUrl}/auth/error`);
      errorUrl.searchParams.set("error", error instanceof Error ? error.message : "Authentication failed");
      res.redirect(errorUrl.toString());
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout - revoke session" })
  @ApiResponse({ status: 200, description: "Logged out" })
  async logout(@Req() req: Request, @Body() body: { token?: string }): Promise<{ ok: boolean }> {
    // Extract token from body or Authorization header
    const token = body.token ?? req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await this.sessionService.validateToken(token).then((result) => {
        if (result) {
          this.sessionService.revokeSession(result.session.session_id);
        }
      });
    }
    return { ok: true };
  }

  @Get("providers")
  @ApiOperation({ summary: "List available OIDC providers" })
  @ApiResponse({ status: 200, description: "Available providers" })
  getProviders(): Array<{ name: string; authorizationUrl: string }> {
    const google = this.oidc["google"];
    const github = this.oidc["github"];
    return [
      { name: "google", authorizationUrl: google.authorizationUrl },
      { name: "github", authorizationUrl: github.authorizationUrl },
    ];
  }
}