/**
 * P2 linking nonce consumption (task 14.17).
 * Consume the P2 single-use linking nonce in the channel account-linking flow.
 * A channel-stated email cannot bind without redeeming a P2 nonce.
 */

export interface LinkingNonce {
  nonce: string;
  email: string;
  expiresAt: string;
  used: boolean;
}

/** In-memory linking nonce store. */
export class LinkingNonceStore {
  private readonly nonces = new Map<string, LinkingNonce>();

  /** Store a linking nonce. */
  store(nonce: string, email: string, expiresAt: string): void {
    this.nonces.set(nonce, { nonce, email, expiresAt, used: false });
  }

  /** Consume a nonce. Returns the email if valid and not yet used. */
  consume(nonce: string): string | null {
    const nonceRecord = this.nonces.get(nonce);
    if (!nonceRecord) {
      return null;
    }
    if (nonceRecord.used) {
      return null;
    }
    const now = Date.now();
    if (Date.parse(nonceRecord.expiresAt) < now) {
      return null;
    }
    nonceRecord.used = true;
    return nonceRecord.email;
  }

  /** Return all nonces (for testing). */
  getAll(): readonly LinkingNonce[] {
    return [...this.nonces.values()];
  }

  /** Clear all nonces (for testing). */
  clear(): void {
    this.nonces.clear();
  }
}
