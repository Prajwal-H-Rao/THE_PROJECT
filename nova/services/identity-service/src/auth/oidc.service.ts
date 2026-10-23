/** OIDC service for Google and GitHub authentication. */

import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, PoolClient } from "pg";
import { OidcStateStore, OidcStateRecord } from "./oidc-state.store.js";
import { SessionService } from "../session/session.service.js";
import { UserRepository } from "../account/user.repository.js";
import { generateState } from "../session/session.tokens.js";

export interface OidcProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  hd?: string; // Google hosted domain
  login?: string; // GitHub username
  avatar_url?: string; // GitHub avatar
}

@Injectable()
export class OidcService {
  private readonly google: OidcProviderConfig;
  private readonly github: OidcProviderConfig;

  constructor(
    private readonly config: ConfigService,
    private readonly stateStore: OidcStateStore,
    private readonly sessionService: SessionService,
    private readonly userRepo: UserRepository,
    @Inject("PG_POOL") private readonly pool: Pool
  ) {
    this.google = {
      clientId: config.get("GOOGLE_CLIENT_ID") ?? "",
      clientSecret: config.get("GOOGLE_CLIENT_SECRET") ?? "",
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
      scope: "openid email profile",
    };
    this.github = {
      clientId: config.get("GITHUB_CLIENT_ID") ?? "",
      clientSecret: config.get("GITHUB_CLIENT_SECRET") ?? "",
      authorizationUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      userInfoUrl: "https://api.github.com/user",
      scope: "read:user user:email",
    };
  }

  private getProvider(provider: "google" | "github"): OidcProviderConfig {
    return provider === "google" ? this.google : this.github;
  }

  /** Generate the authorization URL for the OIDC flow. */
  async getAuthorizationUrl(
    provider: "google" | "github",
    redirectUri: string
  ): Promise<{ url: string; state: string; codeVerifier: string }> {
    const config = this.getProvider(provider);
    const state = generateState();
    const { verifier, challenge } = this.sessionService.generatePkce();
    const nonce = generateState(); // reuse for nonce

    await this.stateStore.create(state, provider, verifier, nonce, redirectUri);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scope,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "consent",
    });

    return { url: `${config.authorizationUrl}?${params.toString()}`, state, codeVerifier: verifier };
  }

  /** Exchange authorization code for tokens. */
  async exchangeCode(
    provider: "google" | "github",
    code: string,
    state: string,
    redirectUri: string
  ): Promise<{ tokens: TokenResponse; stateRecord: OidcStateRecord }> {
    const stateRecord = await this.stateStore.consume(state);
    if (!stateRecord) {
      throw new Error("Invalid or expired state");
    }
    if (stateRecord.provider !== provider) {
      throw new Error("Provider mismatch");
    }

    const config = this.getProvider(provider);
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: stateRecord.code_verifier,
    });

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = (await response.json()) as TokenResponse;
    return { tokens, stateRecord };
  }

  /** Fetch user info from provider. */
  async fetchUserInfo(provider: "google" | "github", accessToken: string): Promise<UserInfo> {
    const config = this.getProvider(provider);
    const response = await fetch(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    const data = await response.json() as Record<string, unknown>;

    if (provider === "google") {
      return {
        sub: String(data.sub),
        email: String(data.email),
        email_verified: Boolean(data.email_verified ?? false),
        name: data.name as string | undefined,
        picture: data.picture as string | undefined,
        hd: data.hd as string | undefined,
      };
    } else {
      // GitHub: need to fetch emails separately if not public
      let email = data.email as string | undefined;
      let emailVerified = true;
      if (!email) {
        const emailsResponse = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        });
        if (emailsResponse.ok) {
          const emails = await emailsResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
          const primary = emails.find((e) => e.primary && e.verified);
          if (primary) {
            email = primary.email;
          }
        }
      }
      return {
        sub: String(data.id),
        email: email ?? "",
        email_verified: emailVerified,
        name: data.name as string | undefined,
        picture: data.avatar_url as string | undefined,
        login: data.login as string | undefined,
      };
    }
  }

  /** Find or create user from OIDC provider. */
  async findOrCreateUser(
    provider: "google" | "github",
    userInfo: UserInfo,
    client?: PoolClient
  ): Promise<{ userId: string; isNew: boolean }> {
    // Try to find existing channel identity
    const existing = await this.userRepo.findChannelIdentity(provider, userInfo.sub, client);
    if (existing) {
      return { userId: existing.user_id, isNew: false };
    }

    // Check if user exists by email
    let userId: string | undefined;
    if (userInfo.email) {
      const byEmail = await this.userRepo.findByEmail(userInfo.email, client);
      if (byEmail) {
        userId = byEmail.user_id;
      }
    }

    // Create new user if not found
    if (!userId) {
      userId = await this.userRepo.createUser({
        email: userInfo.email,
        email_verified: userInfo.email_verified,
        display_name: userInfo.name,
        avatar_url: userInfo.picture,
      }, client);
    }

    // Link channel identity
    await this.userRepo.linkChannelIdentity({
      user_id: userId,
      provider,
      provider_user_id: userInfo.sub,
      provider_data: { email: userInfo.email, name: userInfo.name, picture: userInfo.picture },
    }, client);

    return { userId, isNew: !existing };
  }
}