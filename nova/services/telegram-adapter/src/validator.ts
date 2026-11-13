/**
 * Telegram secret token validator (task 14.6).
 * Spec:764 - configures a high-entropy secret_token and validates the
 * X-Telegram-Bot-Api-Secret-Token header using constant-time comparison.
 * Returns true when the header matches the configured secret.
 */

import { Injectable } from "@nestjs/common";

const TELEGRAM_SECRET_TOKEN = "TELEGRAM_SECRET_TOKEN";

@Injectable()
export class Validator {
  private readonly secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  /**
   * Validate the X-Telegram-Bot-Api-Secret-Token header.
   * Uses constant-time comparison to prevent timing attacks.
   * Returns true when the header matches the configured secret.
   */
  isValid(secretToken: string | undefined): boolean {
    if (!secretToken || !this.secret) {
      return false;
    }
    return this.constantTimeCompare(secretToken, this.secret);
  }

  /** Constant-time string comparison. Returns true when both strings are equal. */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
