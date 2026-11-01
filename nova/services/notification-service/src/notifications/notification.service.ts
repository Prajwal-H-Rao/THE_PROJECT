/**
 * Nova design system - Notification service.
 * Provides notification delivery and management.
 */

import { Injectable } from "@nestjs/common";
import { Pool } from "pg";

const NOTIFICATIONS_TABLE = "notification_service.notifications";

@Injectable()
export class NotificationService {
  constructor(@Inject("PG_POOL") private readonly pool: Pool) {}

  async createNotification(userId: string, type: string, content: string, channel: string) {
    const query = `
      INSERT INTO notification_service.notifications (user_id, type, content, channel, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING notification_id, user_id, type, content, channel, status, created_at
    `;
    const result = await this.pool.query(query, [userId, type, content, channel]);
    return result.rows[0];
  }

  async listNotifications(userId: string) {
    const query = `
      SELECT notification_id, user_id, type, content, channel, status, created_at
      FROM notification_service.notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    const query = `
      UPDATE notification_service.notifications
      SET status = 'read', updated_at = now()
      WHERE notification_id = $1
      RETURNING notification_id
    `;
    const result = await this.pool.query(query, [notificationId]);
    return (result.rowCount ?? 0) > 0;
  }
}
