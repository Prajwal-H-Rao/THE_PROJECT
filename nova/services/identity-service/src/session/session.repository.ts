/** Session repository for database operations. */

import { Injectable, Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";

export interface SessionRecord {
  session_id: string;
  user_id: string;
  tenant_id: string;
  channel: string;
  issued_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  csrf_token: string;
  created_at: Date;
}

@Injectable()
export class SessionRepository {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  /** Insert a new session record. */
  async create(session: SessionRecord, client?: PoolClient): Promise<void> {
    const sql = `
      INSERT INTO identity_service.sessions
        (session_id, user_id, tenant_id, channel, issued_at, expires_at, revoked_at, csrf_token, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    `;
    const params = [
      session.session_id,
      session.user_id,
      session.tenant_id,
      session.channel,
      session.issued_at,
      session.expires_at,
      session.revoked_at,
      session.csrf_token,
    ];
    await (client ?? this.pool).query(sql, params);
  }

  /** Find a session by ID. */
  async findById(sessionId: string, client?: PoolClient): Promise<SessionRecord | null> {
    const result = await (client ?? this.pool).query(
      `SELECT * FROM identity_service.sessions WHERE session_id = $1`,
      [sessionId]
    );
    return result.rows[0] ?? null;
  }

  /** Find a session by ID and mark it as accessed (extend expiry if needed). */
  async findActive(sessionId: string, now: Date, client?: PoolClient): Promise<SessionRecord | null> {
    const result = await (client ?? this.pool).query(
      `SELECT * FROM identity_service.sessions
       WHERE session_id = $1 AND revoked_at IS NULL AND expires_at > $2`,
      [sessionId, now]
    );
    return result.rows[0] ?? null;
  }

  /** Revoke a session. */
  async revoke(sessionId: string, revokedAt: Date, client?: PoolClient): Promise<boolean> {
    const result = await (client ?? this.pool).query(
      `UPDATE identity_service.sessions SET revoked_at = $1 WHERE session_id = $2 AND revoked_at IS NULL`,
      [revokedAt, sessionId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Revoke all sessions for a user. */
  async revokeAllForUser(userId: string, revokedAt: Date, client?: PoolClient): Promise<number> {
    const result = await (client ?? this.pool).query(
      `UPDATE identity_service.sessions SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL`,
      [revokedAt, userId]
    );
    return result.rowCount ?? 0;
  }

  /** Delete expired sessions. */
  async deleteExpired(now: Date, client?: PoolClient): Promise<number> {
    const result = await (client ?? this.pool).query(
      `DELETE FROM identity_service.sessions WHERE expires_at <= $1`,
      [now]
    );
    return result.rowCount ?? 0;
  }
}