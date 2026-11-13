/**
 * WhatsApp replay guard (task 14.4).
 * Spec:773 - add replay protection: timestamp window plus nonce store.
 * An old signed message fails the timestamp window check.
 */
export class ReplayGuard {
    windowMs;
    nonces = new Map(); // nonce -> timestamp
    constructor(windowMs = 5 * 60 * 1000) {
        this.windowMs = windowMs;
    }
    /**
     * Check whether a message timestamp is within the allowed window.
     * Returns true when the timestamp is recent enough to process.
     * Returns false when the timestamp is too old (replay).
     */
    isWithinWindow(timestampMs) {
        const now = Date.now();
        const age = now - timestampMs;
        return age >= 0 && age <= this.windowMs;
    }
    /**
     * Check whether a nonce has already been used.
     * Returns true if the nonce was already seen (replay).
     * Returns false if the nonce is new (record it and process).
     */
    isNonceReused(nonce) {
        if (this.nonces.has(nonce)) {
            return true;
        }
        this.nonces.set(nonce, Date.now());
        return false;
    }
    /** Return the number of tracked nonces. */
    get count() {
        return this.nonces.size;
    }
    /** Clear all stored nonces (for testing). */
    clear() {
        this.nonces.clear();
    }
}
