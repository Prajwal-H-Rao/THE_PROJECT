/** Session service for creating and managing sessions. */

import { Injectable, Inject } from "@nestjs/common";
import { SessionRepository, SessionRecord } from "./session.repository.js";
import {
  issueSessionToken,
  verifySessionToken,
  generateSessionId,
  generateCsrfToken,
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
  SessionClaims,
  Verification,
} from "./session.tokens.js";
import { Pool, PoolClient } from "pg";

@Injectable()
export class SessionService {
  constructor(
    private readonly repo: SessionRepository,
    @Inject("PG_POOL") private readonly pool: Pool,
    private readonly secret: string,
    private readonly ttlSeconds: number
  ) {}

  /** Create a new session for a user. */
  async createSession(
    userId: string,
    tenantId: string,
    channel: string,
    client?: PoolClient
  ): Promise<{ token: string; session: SessionRecord; csrfToken: string }> {
    const sessionId = generateSessionId();
    const csrfToken = generateCsrfToken();
    const now = new Date();
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);

    const session: SessionRecord = {
      session_id: sessionId,
      user_id: userId,
      tenant_id: tenantId,
      channel,
      issued_at: now,
      expires_at: expiresAt,
      revoked_at: null,
      csrf_token: csrfToken,
      created_at: now,
    };

    await this.repo.create(session, client);

    const claims: Omit<SessionClaims, "iat" | "exp"> = {
      sub: userId,
      sid: sessionId,
      tenant: tenantId,
      channel,
      csrf: csrfToken,
    };
    const token = issueSessionToken(claims, this.secret, this.ttlSeconds);

    return { token, session, csrfToken };
  }

  /** Validate a session token and return the session record. */
  async validateToken(token: string, client?: PoolClient): Promise<{ claims: SessionClaims; session: SessionRecord } | null> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const verification = verifySessionToken(token, this.secret, nowSeconds);
    if (!verification.ok) {
      return null;
    }
    const session = await this.repo.findActive(verification.claims.sid, new Date(), client);
    if (!session) {
      return null;
    }
    if (session.csrf_token !== verification.claims.csrf) {
      return null;
    }
    return { claims: verification.claims, session };
  }

  /** Revoke a session by ID. */
  async revokeSession(sessionId: string, client?: PoolClient): Promise<boolean> {
    return this.repo.revoke(sessionId, new Date(), client);
  }

  /** Revoke all sessions for a user. */
  async revokeAllForUser(userId: string, client?: PoolClient): Promise<number> {
    return this.repo.revokeAllForUser(userId, new Date(), client);
  }

  /** Generate PKCE pair for OIDC flow. */
  generatePkce(): { verifier: string; challenge: string } {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    return { verifier, challenge };
  }

  /** Generate state parameter for OIDC. */
  generateState(): string {
    return generateState();
  }
}