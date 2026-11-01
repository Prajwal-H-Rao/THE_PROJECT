/**
 * SendService for sending emails behind an approval grant.
 * Verifies the grant nonce before sending, then sends via GmailAdapter.
 * Returns provider message_id on success.
 * Throws GrantDeniedError if grant is invalid or missing.
 */

import { GmailAdapter } from "./gmail-adapter.js";
import { GrantVerifier, GrantDeniedError, GrantNotFoundError } from "./grant-verifier.js";
import type { GrantVerifyResult } from "@nova/contracts/grant-verification-types";

export interface SendServiceOptions {
  readonly userId: string;
  readonly policyVersion: string | number;
}

export class SendService {
  private adapter: GmailAdapter;
  private verifier: GrantVerifier;
  private options: SendServiceOptions;

  constructor(adapter: GmailAdapter, verifier: GrantVerifier, options: SendServiceOptions) {
    this.adapter = adapter;
    this.verifier = verifier;
    this.options = options;
  }

  /** Send a draft email behind an approval grant.
   *  Verifies the grant nonce before sending.
   *  Throws GrantDeniedError if the grant is invalid, missing, or denied.
   *  Returns provider message_id on success.
   */
  async send(draftId: string, grantNonce: string, payload: unknown, target: string): Promise<{ messageId: string }> {
    const verifyResult = await this.verifier.verifyGrant(grantNonce, {
      userId: this.options.userId,
      target,
      payload,
      policyVersion: this.options.policyVersion,
      action: "inbox.send",
    });

    if (!verifyResult.ok) {
      throw new GrantDeniedError(verifyResult.reason ?? "unknown");
    }

    const sendResult = await this.adapter.send(this.options.userId, draftId);
    return { messageId: sendResult.messageId };
  }
}
