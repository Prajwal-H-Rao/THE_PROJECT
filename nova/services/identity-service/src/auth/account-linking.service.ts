/** Account linking service with nonce-based flow. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { SessionService } from "../session/session.service.js";
import { UserRepository } from "../account/user.repository.js";
import { OidcStateStore } from "./oidc-state.store.js";
import { generateState } from "../session/session.tokens.js";

interface ProviderConfig {
  clientId: string;
  authorizationUrl: string;
  scope: string;
}

@Injectable()
export class AccountLinkingService {
  constructor(
    @Inject("PG_POOL") private readonly pool: Pool,
    private readonly sessionService: SessionService,
    private readonly userRepo: UserRepository,
    private readonly oidcStateStore: OidcStateStore
  ) {}

  /** Initiate account linking from a logged-in session. */
  async initiateAccountLinking(
    userId: string,
    provider: "google" | "github" | "telegram" | "whatsapp" | "email",
    redirectUri: string
  ): Promise<{ nonce: string; state: string; authorizationUrl: string }> {
    // Generate nonce and PKCE
    const nonce = this.sessionService.generateState();
    const { verifier, challenge } = this.sessionService.generatePkce();
    const state = generateState(); // reuse for state parameter

    // Store nonce in database
    await this.pool.query(
      `INSERT INTO identity_service.account_linking_nonces
        (user_id, provider, nonce, redirect_uri, state, code_verifier, code_challenge, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '10 minutes')`,
      [userId, provider, nonce, redirectUri, state, verifier, challenge]
    );

    // Build authorization URL
    const providerConfig = this.getProviderConfig(provider);
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: providerConfig.scope,
      state: state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "consent",
    });

    return {
      nonce,
      state,
      authorizationUrl: `${providerConfig.authorizationUrl}?${params.toString()}`
    };
  }

  /** Complete account linking after OIDC callback. */
  async completeAccountLinking(
    nonce: string,
    provider: "google" | "github" | "telegram" | "whatsapp" | "email",
    providerUserId: string,
    providerData: Record<string, unknown>
  ): Promise<{ userId: string }> {
    const result = await this.pool.query(
      `UPDATE identity_service.account_linking_nonces
       SET provider_user_id = $1, consumed_at = NOW()
       WHERE nonce = $1 AND consumed_at IS NULL AND expires_at > NOW()
       RETURNING user_id`,
      [providerUserId, nonce]
    );

    if (!result || result.rowCount === 0) {
      throw new Error("Invalid or expired nonce");
    }

    const userId = result.rows[0].user_id;

    // Link the channel identity
    await this.pool.query(
      `INSERT INTO identity_service.channel_identities
        (user_id, provider, provider_user_id, provider_data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider, provider_user_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         unlinked_at = NULL`,
      [userId, provider, providerUserId, JSON.stringify(providerData)]
    );

    return { userId };
  }

  private getProviderConfig(provider: "google" | "github" | "telegram" | "whatsapp" | "email"): { clientId: string; authorizationUrl: string; scope: string } {
    const configs: Record<string, { clientId: string; authorizationUrl: string; scope: string }> = {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        scope: "openid email profile",
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID ?? "",
        authorizationUrl: "https://github.com/login/oauth/authorize",
        scope: "read:user user:email",
      },
      telegram: {
        clientId: process.env.TELEGRAM_BOT_TOKEN ?? "",
        authorizationUrl: "https://oauth.telegram.org/auth",
        scope: "user",
      },
      whatsapp: {
        clientId: process.env.WHATSAPP_CLIENT_ID ?? "",
        authorizationUrl: "https://www.whatsapp.com/oauth/authorize",
        scope: "profile",
      },
      email: {
        clientId: process.env.EMAIL_CLIENT_ID ?? "",
        authorizationUrl: "https://api.nova.local/auth/email",
        scope: "email",
      },
    };

    const config = configs[provider];
    if (!config) {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    return config;
  }
}