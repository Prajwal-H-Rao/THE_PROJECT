/**
 * WhatsApp signature verifier (task 14.1).
 * Claim C12: WhatsApp signature is X-Hub-Signature-256, HMAC-SHA256 over the
 * raw body, `sha256=` prefix.
 * Spec:772 - verify webhook authenticity using the provider's currently
 * documented signature procedure over the raw request body and the configured
 * app secret, using constant-time comparison.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export class SignatureValidator {
  private readonly appSecret: string;

  constructor(appSecret: string) {
    this.appSecret = appSecret;
  }

  /**
   * Verify the X-Hub-Signature-256 header over the raw request body.
   * Returns true when the signature matches HMAC-SHA256(appSecret, body).
   */
  isValid(rawBody: Buffer | string, signature: string | undefined): boolean {
    if (!signature || !this.appSecret) {
      return false;
    }

    const expected = createHmac("sha256", this.appSecret)
      .update(typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody)
      .digest("hex");

    const expectedSig = `sha256=${expected}`;
    if (expectedSig.length !== signature.length) {
      return false;
    }
    return timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature));
  }
}
