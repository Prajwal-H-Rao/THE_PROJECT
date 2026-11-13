/**
 * WhatsApp outbound sender (task 14.5).
 * Spec:773 - enforce per-user rate limits and opt-in state.
 * Opt-out stops delivery.
 */

export interface RateLimitState {
  count: number;
  windowStart: number;
}

export interface OptInState {
  optedIn: boolean;
  optedOutAt?: number;
}

export class OutboundSender {
  private readonly rateLimitMap = new Map<string, RateLimitState>();
  private readonly optInMap = new Map<string, OptInState>();

  private readonly messagesPerMinute: number;
  private readonly windowMs: number;

  constructor(messagesPerMinute: number = 30, windowMs: number = 60 * 1000) {
    this.messagesPerMinute = messagesPerMinute;
    this.windowMs = windowMs;
  }

  /**
   * Check whether a message can be sent to a user.
   * Returns true when the user has opted in and is within rate limits.
   * Returns false when the user has opted out or is rate limited.
   */
  canSend(userId: string): boolean {
    // Check opt-in state
    const optIn = this.optInMap.get(userId);
    if (!optIn || !optIn.optedIn || optIn.optedOutAt !== undefined) {
      return false;
    }

    // Check rate limit
    const now = Date.now();
    const state = this.rateLimitMap.get(userId);
    if (!state) {
      this.rateLimitMap.set(userId, { count: 1, windowStart: now });
      return true;
    }

    // Reset window if expired
    if (now - state.windowStart >= this.windowMs) {
      state.count = 1;
      state.windowStart = now;
      return true;
    }

    // Check if under rate limit
    if (state.count < this.messagesPerMinute) {
      state.count++;
      return true;
    }

    return false;
  }

  /**
   * Record that a user has opted in to WhatsApp messages.
   */
  optIn(userId: string): void {
    this.optInMap.set(userId, { optedIn: true, optedOutAt: undefined });
  }

  /**
   * Record that a user has opted out of WhatsApp messages.
   * Opt-out stops delivery.
   */
  optOut(userId: string): void {
    this.optInMap.set(userId, { optedIn: false, optedOutAt: Date.now() });
  }

  /**
   * Check whether a user has opted in.
   */
  isOptedIn(userId: string): boolean {
    const optIn = this.optInMap.get(userId);
    return optIn?.optedIn === true && optIn.optedOutAt === undefined;
  }

  /** Return the number of tracked users. */
  get userCount(): number {
    return this.optInMap.size;
  }

  /** Clear all state (for testing). */
  clear(): void {
    this.rateLimitMap.clear();
    this.optInMap.clear();
  }
}
