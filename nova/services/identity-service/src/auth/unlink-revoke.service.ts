/** Unlink and revoke service for comprehensive access revocation. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { SessionService } from "../session/session.service.js";
import { TotpService } from "../totp/totp.service.js";
import { RefreshTokenService } from "./refresh-token.service.js";

@Injectable()
export class UnlinkRevokeService {
  constructor(
    @Inject("PG_POOL") private readonly pool: Pool,
    private readonly sessionService: SessionService,
    private readonly totpService: TotpService,
    private readonly refreshTokenService: RefreshTokenService
  ) {}

  /** Unlink a channel identity (soft delete). */
  async unlinkChannelIdentity(userId: string, provider: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE identity_service.channel_identities
       SET unlinked_at = NOW()
       WHERE user_id = $1 AND provider = $2 AND unlinked_at IS NULL`,
      [userId, provider]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Revoke all sessions for a user. */
  async revokeAllSessions(userId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE identity_service.sessions
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    return result.rowCount ?? 0;
  }

  /** Revoke all refresh tokens for a user. */
  async revokeAllRefreshTokens(userId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE identity_service.refresh_tokens
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    return result.rowCount ?? 0;
  }

  /** Revoke TOTP for a user. */
  async revokeTotp(userId: string): Promise<boolean> {
    await this.pool.query(
      `DELETE FROM identity_service.totp_secrets WHERE user_id = $1`,
      [userId]
    );
    return true;
  }

  /** Comprehensive revocation of all user access. */
  async revokeAllUserAccess(userId: string): Promise<{
    sessionsRevoked: number;
    refreshTokensRevoked: number;
    totpRevoked: boolean;
    channelsUnlinked: number;
  }> {
    const sessionsRevoked = await this.revokeAllSessions(userId);
    const refreshTokensRevoked = await this.revokeAllRefreshTokens(userId);
    const totpRevoked = await this.revokeTotp(userId);

    // Unlink all channel identities
    const channelsResult = await this.pool.query(
      `UPDATE identity_service.channel_identities
       SET unlinked_at = NOW()
       WHERE user_id = $1 AND unlinked_at IS NULL`,
      [userId]
    );
    const channelsUnlinked = channelsResult.rowCount ?? 0;

    return {
      sessionsRevoked,
      refreshTokensRevoked,
      totpRevoked: true,
      channelsUnlinked
    };
  }

  /** Revoke a specific session. */
  async revokeSession(sessionId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE identity_service.sessions
       SET revoked_at = NOW()
       WHERE session_id = $1 AND revoked_at IS NULL`,
      [sessionId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Revoke a specific refresh token. */
  async revokeRefreshToken(tokenId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE identity_service.refresh_tokens
       SET revoked_at = NOW()
       WHERE token_id = $1 AND revoked_at IS NULL`,
      [tokenId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Revoke a specific channel identity. */
  async revokeChannelIdentity(identityId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE identity_service.channel_identities
       SET unlinked_at = NOW()
       WHERE identity_id = $1 AND unlinked_at IS NULL`,
      [identityId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}